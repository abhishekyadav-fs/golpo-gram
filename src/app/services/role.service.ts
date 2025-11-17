import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { Role } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class RoleService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(environment.supabase.url, environment.supabase.anonKey);
  }

  async getRoles(): Promise<Role[]> {
    const { data, error } = await this.supabase
      .from('roles')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async getRoleByName(name: 'user' | 'moderator' | 'admin'): Promise<Role | null> {
    const { data, error } = await this.supabase
      .from('roles')
      .select('*')
      .eq('name', name)
      .single();

    if (error) throw error;
    return data;
  }

  async updateUserRole(userId: string, roleName: 'user' | 'moderator' | 'admin'): Promise<void> {
    const role = await this.getRoleByName(roleName);
    if (!role) throw new Error('Role not found');

    const { error } = await this.supabase
      .from('profiles')
      .update({ role_id: role.id })
      .eq('id', userId);

    if (error) throw error;
  }
}
