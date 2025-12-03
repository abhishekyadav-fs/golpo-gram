import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

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
export class SupabaseService {
  private static supabaseInstance: SupabaseClient | null = null;

  constructor() {
    if (!SupabaseService.supabaseInstance) {
      SupabaseService.supabaseInstance = createClient(
        environment.supabase.url,
        environment.supabase.anonKey,
        {
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
        }
      );
    }
  }

  getClient(): SupabaseClient {
    if (!SupabaseService.supabaseInstance) {
      SupabaseService.supabaseInstance = createClient(
        environment.supabase.url,
        environment.supabase.anonKey,
        {
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
        }
      );
    }
    return SupabaseService.supabaseInstance;
  }
}
