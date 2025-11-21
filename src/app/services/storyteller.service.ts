import { Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { Storyteller } from '../models/storyteller.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class StorytellerService {
  private supabase: SupabaseClient;

  constructor(private authService: AuthService) {
    this.supabase = this.authService.getSupabaseClient();
  }

  async getStorytellerProfile(userId: string): Promise<Storyteller | null> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('id, full_name, storyteller_name, storyteller_bio, storyteller_photo_url, profile_image_url, story_count, first_story_date, created_at')
      .eq('id', userId)
      .eq('is_storyteller', true)
      .single();

    if (error) {
      console.error('Error fetching storyteller profile:', error);
      return null;
    }

    console.log('Raw profile data from database:', data);

    // Convert storage paths to public URLs if needed
    let photoUrl = data.storyteller_photo_url;
    if (photoUrl && !photoUrl.startsWith('http')) {
      console.log('Converting storyteller_photo_url from path to URL:', photoUrl);
      const { data: publicUrlData } = this.supabase.storage
        .from('profile-images')
        .getPublicUrl(photoUrl);
      photoUrl = publicUrlData.publicUrl;
      console.log('Converted to public URL:', photoUrl);
    }

    // Also check profile_image_url as fallback
    let profileImageUrl = data.profile_image_url;
    if (profileImageUrl && !profileImageUrl.startsWith('http')) {
      console.log('Converting profile_image_url from path to URL:', profileImageUrl);
      const { data: publicUrlData } = this.supabase.storage
        .from('profile-images')
        .getPublicUrl(profileImageUrl);
      profileImageUrl = publicUrlData.publicUrl;
      console.log('Converted to public URL:', profileImageUrl);
    }

    const result = {
      ...data,
      storyteller_photo_url: photoUrl,
      profile_image_url: profileImageUrl
    } as Storyteller;

    console.log('Returning storyteller profile:', result);
    return result;
  }

  async getAllStorytellers(): Promise<Storyteller[]> {
    const { data, error } = await this.supabase
      .from('public_storytellers')
      .select('*');

    if (error) {
      console.error('Error fetching storytellers:', error);
      return [];
    }

    return data as Storyteller[];
  }

  async searchStorytellers(searchTerm: string): Promise<Storyteller[]> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('id, full_name, storyteller_name, storyteller_bio, storyteller_photo_url, story_count, first_story_date, created_at')
      .eq('is_storyteller', true)
      .or(`storyteller_name.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%`);

    if (error) {
      console.error('Error searching storytellers:', error);
      return [];
    }

    return data as Storyteller[];
  }

  async updateStorytellerProfile(userId: string, updates: Partial<Storyteller>): Promise<void> {
    const { error } = await this.supabase
      .from('profiles')
      .update({
        storyteller_name: updates.storyteller_name,
        storyteller_bio: updates.storyteller_bio,
        storyteller_photo_url: updates.storyteller_photo_url
      })
      .eq('id', userId);

    if (error) throw error;
  }

  async uploadStorytellerPhoto(userId: string, file: File): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/profile.${fileExt}`;
    const filePath = `${fileName}`;

    const { data, error } = await this.supabase.storage
      .from('profile-images')
      .upload(filePath, file, { upsert: true });

    if (error) throw error;

    const { data: publicUrl } = this.supabase.storage
      .from('profile-images')
      .getPublicUrl(filePath);

    return publicUrl.publicUrl;
  }
}
