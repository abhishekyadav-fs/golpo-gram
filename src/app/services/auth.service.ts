import { Injectable } from '@angular/core';
import { SupabaseClient, AuthChangeEvent, Session } from '@supabase/supabase-js';
import { BehaviorSubject, Observable } from 'rxjs';
import { User } from '../models/user.model';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private static instance: AuthService;
  private supabase!: SupabaseClient;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$: Observable<User | null> = this.currentUserSubject.asObservable();
  
  // Prevent concurrent session calls
  private loadingUserPromise: Promise<void> | null = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  constructor(private supabaseService: SupabaseService) {
    // Singleton pattern - ensure only one instance
    if (AuthService.instance) {
      return AuthService.instance;
    }
    
    this.supabase = this.supabaseService.getClient();
    
    AuthService.instance = this;
    this.initialize();
  }

  // Expose the Supabase client to other services to prevent multiple instances
  getSupabaseClient(): SupabaseClient {
    return this.supabase;
  }

  async initialize() {
    if (this.initPromise) {
      return this.initPromise;
    }

    if (this.isInitialized) return;
    
    this.initPromise = (async () => {
      this.isInitialized = true;
      this.initAuthListener();
      
      // Initial session check - serialize this call
      await this.loadUser();
    })();

    return this.initPromise;
  }

  private async initAuthListener() {
    this.supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (session?.user) {
        // Serialize loadUser calls
        this.loadUser();
      } else {
        this.currentUserSubject.next(null);
      }
    });
  }

  private async loadUser(): Promise<void> {
    // If already loading, return the existing promise to prevent concurrent calls
    if (this.loadingUserPromise) {
      return this.loadingUserPromise;
    }

    this.loadingUserPromise = this.performLoadUser();
    
    try {
      await this.loadingUserPromise;
    } finally {
      this.loadingUserPromise = null;
    }
  }

  private async performLoadUser(): Promise<void> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (user) {
        const { data: profile, error } = await this.supabase
          .from('profiles')
          .select(`
            *,
            role:roles(id, name, description)
          `)
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error loading user profile:', error);
          return;
        }

        if (profile) {
          // Convert storage paths to public URLs if needed
          let profileImageUrl = profile.profile_image_url;
          if (profileImageUrl && !profileImageUrl.startsWith('http')) {
            const { data: publicUrlData } = this.supabase.storage
              .from('profile-images')
              .getPublicUrl(profileImageUrl);
            profileImageUrl = publicUrlData.publicUrl;
          }

          let storytellerPhotoUrl = profile.storyteller_photo_url;
          if (storytellerPhotoUrl && !storytellerPhotoUrl.startsWith('http')) {
            const { data: publicUrlData } = this.supabase.storage
              .from('profile-images')
              .getPublicUrl(storytellerPhotoUrl);
            storytellerPhotoUrl = publicUrlData.publicUrl;
          }

          this.currentUserSubject.next({
            id: profile.id,
            email: user.email || '',
            full_name: profile.full_name,
            profile_image_url: profileImageUrl,
            role_id: profile.role_id,
            role_name: profile.role?.name,
            created_at: new Date(profile.created_at),
            is_storyteller: profile.is_storyteller,
            storyteller_name: profile.storyteller_name,
            storyteller_bio: profile.storyteller_bio,
            storyteller_photo_url: storytellerPhotoUrl
          });
        } else {
          // Profile doesn't exist, create it
          console.log('Profile not found, creating one...');
          await this.createProfile(user);
        }
      }
    } catch (error) {
      console.error('Error in performLoadUser:', error);
    }
  }

  private async createProfile(user: any) {
    // Get default 'user' role id
    const { data: userRole } = await this.supabase
      .from('roles')
      .select('id')
      .eq('name', 'user')
      .maybeSingle();

    if (userRole) {
      const { error } = await this.supabase.from('profiles').insert({
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        role_id: userRole.id
      });

      if (!error) {
        // Reload user after creating profile
        await this.loadUser();
      } else {
        console.error('Error creating profile:', error);
      }
    }
  }

  async signUp(email: string, password: string, fullName: string) {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName
        }
      }
    });

    if (error) throw error;

    // Get default 'user' role id
    const { data: userRole } = await this.supabase
      .from('roles')
      .select('id')
      .eq('name', 'user')
      .maybeSingle();

    // Create profile
    if (data.user && userRole) {
      await this.supabase.from('profiles').insert({
        id: data.user.id,
        email: email,
        full_name: fullName,
        role_id: userRole.id
      });
    }

    return data;
  }

  async signIn(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    return data;
  }

  async signOut() {
    const { error } = await this.supabase.auth.signOut();
    if (error) throw error;
    this.currentUserSubject.next(null);
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  async reloadUser(): Promise<void> {
    await this.loadUser();
  }

  async updateProfile(updates: { 
    email?: string; 
    full_name?: string; 
    profile_image?: File | null;
    storyteller_name?: string;
    storyteller_bio?: string;
  }): Promise<void> {
    const user = this.getCurrentUser();
    if (!user) throw new Error('No user logged in');

    try {
      // Update email in Supabase Auth if changed
      if (updates.email && updates.email !== user.email) {
        const { error: emailError } = await this.supabase.auth.updateUser({
          email: updates.email
        });
        if (emailError) throw emailError;
      }

      // Upload profile image if provided
      let profileImageUrl = user.profile_image_url;
      if (updates.profile_image) {
        const fileName = `${user.id}_${Date.now()}.${updates.profile_image.name.split('.').pop()}`;
        const { data: uploadData, error: uploadError } = await this.supabase.storage
          .from('profile-images')
          .upload(fileName, updates.profile_image, {
            upsert: true
          });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = this.supabase.storage
          .from('profile-images')
          .getPublicUrl(fileName);

        profileImageUrl = publicUrl;
      }

      // Prepare update object
      const profileUpdates: any = {
        email: updates.email || user.email,
        full_name: updates.full_name || user.full_name,
        profile_image_url: profileImageUrl
      };

      // Add storyteller fields if user is a storyteller
      if (user.is_storyteller) {
        // Set storyteller_photo_url to match profile_image_url for storytellers
        profileUpdates.storyteller_photo_url = profileImageUrl;
        
        if (updates.storyteller_name !== undefined) {
          profileUpdates.storyteller_name = updates.storyteller_name;
        }
        if (updates.storyteller_bio !== undefined) {
          profileUpdates.storyteller_bio = updates.storyteller_bio;
        }
      }

      // Update profile in database
      const { error: profileError } = await this.supabase
        .from('profiles')
        .update(profileUpdates)
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Reload user data
      await this.loadUser();
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }

  isAuthenticated(): boolean {
    return this.currentUserSubject.value !== null;
  }

  async waitForAuthReady(): Promise<boolean> {
    await this.initialize();
    return this.isAuthenticated();
  }

  isModerator(): boolean {
    const user = this.currentUserSubject.value;
    return user?.role_name === 'moderator' || user?.role_name === 'admin';
  }

  async resetPassword(email: string): Promise<void> {
    const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });
    
    if (error) throw error;
  }

  async updatePassword(newPassword: string): Promise<void> {
    const { error } = await this.supabase.auth.updateUser({
      password: newPassword
    });
    
    if (error) throw error;
  }
}
