import { Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { Locality } from '../models/story.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class LocalityService {
  private supabase: SupabaseClient;

  constructor(private authService: AuthService) {
    this.supabase = this.authService.getSupabaseClient();
  }

  async getLocalities(): Promise<Locality[]> {
    const { data, error } = await this.supabase
      .from('localities')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async createLocality(locality: Omit<Locality, 'id' | 'created_at'>): Promise<Locality> {
    const { data, error } = await this.supabase
      .from('localities')
      .insert(locality)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
