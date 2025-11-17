import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, AuthChangeEvent, Session } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { BehaviorSubject, Observable } from 'rxjs';
import { User } from '../models/user.model';

// Clear all Supabase locks and old data IMMEDIATELY when module loads
// This runs before any Angular initialization
try {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.includes('sb-') || key.includes('supabase') || key.includes('lock:'))) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn('Could not remove key:', key, e);
    }
  });
  console.log('Cleared Supabase locks and old data');
} catch (e) {
  console.warn('Could not clear old Supabase data:', e);
}

// Custom storage adapter to avoid lock issues
const customStorageAdapter = {
  getItem: (key: string) => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn('Error reading from localStorage:', e);
      return null;
    }
  },
  setItem: (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn('Error writing to localStorage:', e);
    }
  },
  removeItem: (key: string) => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn('Error removing from localStorage:', e);
    }
  }
};

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

  constructor() {
    // Singleton pattern - ensure only one instance
    if (AuthService.instance) {
      return AuthService.instance;
    }
    
    this.supabase = createClient(environment.supabase.url, environment.supabase.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        storage: customStorageAdapter,
        storageKey: 'golpogram-auth',
        // Disable lock to prevent NavigatorLockAcquireTimeoutError
        lock: async (name, acquireTimeout, fn) => {
          // Simple implementation without actual locking
          return await fn();
        }
      }
    });
    
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
          this.currentUserSubject.next({
            id: profile.id,
            email: user.email || '',
            full_name: profile.full_name,
            profile_image_url: profile.profile_image_url,
            role_id: profile.role_id,
            role_name: profile.role?.name,
            created_at: new Date(profile.created_at)
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

  async updateProfile(updates: { email?: string; full_name?: string; profile_image?: File | null }): Promise<void> {
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

      // Update profile in database
      const { error: profileError } = await this.supabase
        .from('profiles')
        .update({
          email: updates.email || user.email,
          full_name: updates.full_name || user.full_name,
          profile_image_url: profileImageUrl
        })
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
}
