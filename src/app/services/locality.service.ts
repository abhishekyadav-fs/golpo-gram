import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { Locality } from '../models/story.model';

@Injectable({
  providedIn: 'root'
})
export class LocalityService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(environment.supabase.url, environment.supabase.anonKey);
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
