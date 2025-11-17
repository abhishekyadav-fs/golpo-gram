import { Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { Story, MediaFile } from '../models/story.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class StoryService {
  private supabase: SupabaseClient;

  constructor(private authService: AuthService) {
    this.supabase = this.authService.getSupabaseClient();
  }

  async createStory(story: Story, files: File[]): Promise<Story> {
    const user = this.authService.getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    // Insert story
    const { data: storyData, error: storyError } = await this.supabase
      .from('stories')
      .insert({
        title: story.title,
        content: story.content,
        locality_id: story.locality_id,
        author_id: user.id,
        status: 'pending',
        story_type: 'text'
      })
      .select()
      .single();

    if (storyError) throw storyError;

    // Upload media files
    if (files.length > 0) {
      const mediaFiles = await this.uploadMediaFiles(storyData.id, files);
      
      // Insert media file records
      const { error: mediaError } = await this.supabase
        .from('media_files')
        .insert(mediaFiles);

      if (mediaError) throw mediaError;
    }

    return storyData;
  }

  async createAudioStory(title: string, localityId: string, audioFile: File, duration: number): Promise<Story> {
    const user = this.authService.getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    // Upload audio file to storage
    const fileExt = audioFile.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${fileName}`;

    const { data: uploadData, error: uploadError } = await this.supabase.storage
      .from('audio-stories')
      .upload(filePath, audioFile);

    if (uploadError) throw uploadError;

    const { data: publicUrl } = this.supabase.storage
      .from('audio-stories')
      .getPublicUrl(filePath);

    // Insert audio story
    const { data: storyData, error: storyError } = await this.supabase
      .from('stories')
      .insert({
        title: title,
        content: null,
        locality_id: localityId,
        author_id: user.id,
        status: 'pending',
        story_type: 'audio',
        audio_url: publicUrl.publicUrl,
        audio_duration: duration
      })
      .select()
      .single();

    if (storyError) throw storyError;

    return storyData;
  }

  async uploadMediaFiles(storyId: string, files: File[]): Promise<MediaFile[]> {
    const mediaFiles: MediaFile[] = [];

    for (const file of files) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${storyId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `stories/${fileName}`;

      const { data, error } = await this.supabase.storage
        .from('media')
        .upload(filePath, file);

      if (error) throw error;

      const { data: publicUrl } = this.supabase.storage
        .from('media')
        .getPublicUrl(filePath);

      const fileType = this.getFileType(file.type);

      mediaFiles.push({
        story_id: storyId,
        file_url: publicUrl.publicUrl,
        file_type: fileType,
        file_name: file.name,
        file_size: file.size
      });
    }

    return mediaFiles;
  }

  private getFileType(mimeType: string): 'image' | 'video' | 'audio' {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'image';
  }

  async getStoriesByLocality(localityId: string, status: string = 'approved'): Promise<Story[]> {
    const { data, error } = await this.supabase
      .from('stories')
      .select(`
        *,
        locality:localities(name),
        author:profiles!stories_author_id_fkey(full_name),
        media_files(*)
      `)
      .eq('locality_id', localityId)
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getStoryById(id: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('stories')
      .select(`
        *,
        locality:localities(name),
        author:profiles!stories_author_id_fkey(full_name),
        media_files(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    
    // Transform the data to include locality_name and author_name
    return {
      ...data,
      locality_name: data.locality?.name || 'Unknown',
      author_name: data.author?.full_name || 'Anonymous'
    };
  }

  async getPendingStories(): Promise<Story[]> {
    const { data, error } = await this.supabase
      .from('stories')
      .select(`
        *,
        locality:localities(name),
        author:profiles!stories_author_id_fkey(full_name),
        media_files(*)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async moderateStory(storyId: string, status: 'approved' | 'rejected', notes?: string): Promise<void> {
    const user = this.authService.getCurrentUser();
    if (!user || !this.authService.isModerator()) {
      throw new Error('Unauthorized');
    }

    const { error } = await this.supabase
      .from('stories')
      .update({
        status,
        moderator_id: user.id,
        moderator_notes: notes,
        moderated_at: new Date().toISOString()
      })
      .eq('id', storyId);

    if (error) throw error;
  }

  async getMyStories(): Promise<Story[]> {
    const user = this.authService.getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await this.supabase
      .from('stories')
      .select(`
        *,
        locality:localities(name),
        media_files(*)
      `)
      .eq('author_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }
}
