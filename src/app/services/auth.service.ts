import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, AuthChangeEvent, Session } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { BehaviorSubject, Observable } from 'rxjs';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private supabase: SupabaseClient;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$: Observable<User | null> = this.currentUserSubject.asObservable();

  constructor() {
    this.supabase = createClient(environment.supabase.url, environment.supabase.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce'
      }
    });
    this.initAuthListener();
    this.loadUser();
  }

  private async initAuthListener() {
    this.supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (session?.user) {
        this.loadUser();
      } else {
        this.currentUserSubject.next(null);
      }
    });
  }

  private async loadUser() {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (user) {
      const { data: profile } = await this.supabase
        .from('profiles')
        .select(`
          *,
          role:roles(id, name, description)
        `)
        .eq('id', user.id)
        .single();

      if (profile) {
        this.currentUserSubject.next({
          id: profile.id,
          email: user.email || '',
          full_name: profile.full_name,
          role_id: profile.role_id,
          role_name: profile.role?.name,
          created_at: new Date(profile.created_at)
        });
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
      .single();

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

  isAuthenticated(): boolean {
    return this.currentUserSubject.value !== null;
  }

  isModerator(): boolean {
    const user = this.currentUserSubject.value;
    return user?.role_name === 'moderator' || user?.role_name === 'admin';
  }
}
