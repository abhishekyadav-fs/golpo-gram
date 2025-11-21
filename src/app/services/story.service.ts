import { Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { Story, MediaFile, Genre, Tag, StoryImage } from '../models/story.model';
import { AuthService } from './auth.service';
import { EventBusService, EventType } from './event-bus.service';

@Injectable({
  providedIn: 'root'
})
export class StoryService {
  private supabase: SupabaseClient;

  constructor(
    private authService: AuthService,
    private eventBus: EventBusService
  ) {
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

    // Publish story created event
    this.eventBus.publish({
      type: EventType.STORY_CREATED,
      payload: { story: storyData, authorId: user.id }
    });

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

    // Publish story created event
    this.eventBus.publish({
      type: EventType.STORY_CREATED,
      payload: { story: storyData, authorId: user.id }
    });

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
      .is('deleted_at', null)
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
        media_files(*),
        story_images(*)
      `)
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error) throw error;

    // Fetch tags for this story
    const { data: storyTags } = await this.supabase
      .from('story_tags')
      .select('tag:tags(id, name, usage_count)')
      .eq('story_id', id);

    const tags = storyTags?.map(st => st.tag).filter(t => t) || [];
    
    // Process story images to ensure we have public URLs
    let processedStoryImages = [];
    if (data.story_images && data.story_images.length > 0) {
      console.log('Raw story_images from database:', data.story_images);
      processedStoryImages = data.story_images
        .sort((a: any, b: any) => a.image_order - b.image_order)
        .map((img: any) => {
          // If the image_url is already a full URL, use it as-is
          // Otherwise, generate public URL from storage path
          let imageUrl = img.image_url;
          if (imageUrl && !imageUrl.startsWith('http')) {
            console.log('Converting storage path to public URL:', imageUrl);
            const { data: publicUrlData } = this.supabase.storage
              .from('story-images')
              .getPublicUrl(imageUrl);
            imageUrl = publicUrlData.publicUrl;
            console.log('Generated public URL:', imageUrl);
          }
          return {
            ...img,
            image_url: imageUrl
          };
        });
      console.log('Processed story_images:', processedStoryImages);
    }

    // Get audio URL if exists
    let audioUrl = data.audio_url;
    if (audioUrl && !audioUrl.startsWith('http') && data.story_type === 'audio') {
      const { data: publicUrlData } = this.supabase.storage
        .from('audio-stories')
        .getPublicUrl(audioUrl);
      audioUrl = publicUrlData.publicUrl;
    }

    // Get cover image URL if exists
    let coverImageUrl = data.cover_image_url;
    if (coverImageUrl && !coverImageUrl.startsWith('http')) {
      const { data: publicUrlData } = this.supabase.storage
        .from('story-covers')
        .getPublicUrl(coverImageUrl);
      coverImageUrl = publicUrlData.publicUrl;
    }
    
    // Transform the data to include locality_name and author_name
    return {
      ...data,
      locality_name: data.locality?.name || 'Unknown',
      author_name: data.author?.full_name || 'Anonymous',
      tags,
      story_images: processedStoryImages,
      audio_url: audioUrl,
      cover_image_url: coverImageUrl
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
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async moderateStory(storyId: string, status: 'approved' | 'rejected', notes?: string): Promise<void> {
    const user = this.authService.getCurrentUser();
    if (!user || !this.authService.isModerator()) {
      throw new Error('Unauthorized');
    }

    const { data: updatedStory, error } = await this.supabase
      .from('stories')
      .update({
        status,
        moderator_id: user.id,
        moderator_notes: notes,
        moderated_at: new Date().toISOString()
      })
      .eq('id', storyId)
      .select()
      .single();

    if (error) throw error;

    // Publish story moderation event
    const eventType = status === 'approved' ? EventType.STORY_APPROVED : EventType.STORY_REJECTED;
    this.eventBus.publish({
      type: eventType,
      payload: { 
        story: updatedStory, 
        storyId, 
        status, 
        moderatorId: user.id,
        notes 
      }
    });
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
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getStoriesByAuthor(authorId: string, status: string = 'approved'): Promise<Story[]> {
    const { data, error } = await this.supabase
      .from('stories')
      .select(`
        *,
        locality:localities(name),
        author:profiles!stories_author_id_fkey(full_name, storyteller_name),
        media_files(*)
      `)
      .eq('author_id', authorId)
      .eq('status', status)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    return (data || []).map(story => ({
      ...story,
      locality_name: story.locality?.name || 'Unknown',
      author_name: story.author?.storyteller_name || story.author?.full_name || 'Anonymous'
    }));
  }

  async getAllStoriesByAuthor(authorId: string): Promise<Story[]> {
    const { data, error } = await this.supabase
      .from('stories')
      .select(`
        *,
        locality:localities(name),
        author:profiles!stories_author_id_fkey(full_name, storyteller_name),
        media_files(*)
      `)
      .eq('author_id', authorId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    return (data || []).map(story => ({
      ...story,
      locality_name: story.locality?.name || 'Unknown',
      author_name: story.author?.storyteller_name || story.author?.full_name || 'Anonymous'
    }));
  }

  // New enhanced methods for story creation with all new fields

  async getGenres(): Promise<Genre[]> {
    const { data, error } = await this.supabase
      .from('genres')
      .select('*')
      .order('name');

    if (error) throw error;
    return data || [];
  }

  async getTags(limit: number = 100): Promise<Tag[]> {
    const { data, error } = await this.supabase
      .from('tags')
      .select('*')
      .order('usage_count', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  async createOrGetTag(tagName: string): Promise<Tag> {
    // Try to get existing tag
    const { data: existing } = await this.supabase
      .from('tags')
      .select('*')
      .eq('name', tagName.toLowerCase())
      .single();

    if (existing) return existing;

    // Create new tag
    const { data: newTag, error } = await this.supabase
      .from('tags')
      .insert({ name: tagName.toLowerCase() })
      .select()
      .single();

    if (error) throw error;
    return newTag;
  }

  async uploadCoverImage(userId: string, file: File): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}_cover.${fileExt}`;

    const { error: uploadError } = await this.supabase.storage
      .from('story-covers')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data: publicUrl } = this.supabase.storage
      .from('story-covers')
      .getPublicUrl(fileName);

    return publicUrl.publicUrl;
  }

  async uploadStoryImages(userId: string, images: { file: File; caption: string }[]): Promise<StoryImage[]> {
    const storyImages: StoryImage[] = [];

    for (let i = 0; i < images.length; i++) {
      const { file, caption } = images[i];
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}_${i}.${fileExt}`;

      const { error: uploadError } = await this.supabase.storage
        .from('story-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: publicUrl } = this.supabase.storage
        .from('story-images')
        .getPublicUrl(fileName);

      storyImages.push({
        image_url: publicUrl.publicUrl,
        image_caption: caption,
        image_order: i,
        file_size: file.size,
        file_name: file.name
      });
    }

    return storyImages;
  }

  async createEnhancedStory(
    storyData: any,
    mediaFiles: File[],
    coverImage: File | null,
    storyImages: { file: File; preview: string; caption: string }[],
    tags: Tag[]
  ): Promise<Story> {
    const user = this.authService.getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    // Upload cover image if provided
    let coverImageUrl: string | undefined;
    if (coverImage) {
      coverImageUrl = await this.uploadCoverImage(user.id, coverImage);
    }

    // Insert story with all new fields
    const { data: story, error: storyError } = await this.supabase
      .from('stories')
      .insert({
        title: storyData.title,
        content: storyData.content,
        description: storyData.description,
        cover_image_url: coverImageUrl,
        main_characters: storyData.main_characters || [],
        genre: storyData.genre,
        language: storyData.language || 'en',
        locality_id: storyData.locality_id,
        author_id: user.id,
        status: 'pending',
        story_type: 'text'
      })
      .select()
      .single();

    if (storyError) throw storyError;

    // Upload and insert story inline images
    if (storyImages.length > 0) {
      const uploadedImages = await this.uploadStoryImages(user.id, storyImages);
      const imagesWithStoryId = uploadedImages.map(img => ({
        ...img,
        story_id: story.id
      }));

      const { error: imagesError } = await this.supabase
        .from('story_images')
        .insert(imagesWithStoryId);

      if (imagesError) throw imagesError;
    }

    // Upload traditional media files
    if (mediaFiles.length > 0) {
      const media = await this.uploadMediaFiles(story.id, mediaFiles);
      const { error: mediaError } = await this.supabase
        .from('media_files')
        .insert(media);

      if (mediaError) throw mediaError;
    }

    // Handle tags
    if (tags.length > 0) {
      const storyTags = [];
      for (const tag of tags) {
        const createdTag = await this.createOrGetTag(tag.name);
        storyTags.push({
          story_id: story.id,
          tag_id: createdTag.id
        });
      }

      const { error: tagsError } = await this.supabase
        .from('story_tags')
        .insert(storyTags);

      if (tagsError) throw tagsError;
    }

    // Publish story created event
    this.eventBus.publish({
      type: EventType.STORY_CREATED,
      payload: { story, authorId: user.id }
    });

    return story;
  }

  async createEnhancedAudioStory(
    storyData: any,
    audioFile: File,
    duration: number,
    coverImage: File | null,
    tags: Tag[]
  ): Promise<Story> {
    const user = this.authService.getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    // Upload audio file
    const fileExt = audioFile.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { error: uploadError } = await this.supabase.storage
      .from('audio-stories')
      .upload(fileName, audioFile);

    if (uploadError) throw uploadError;

    const { data: publicUrl } = this.supabase.storage
      .from('audio-stories')
      .getPublicUrl(fileName);

    // Upload cover image if provided
    let coverImageUrl: string | undefined;
    if (coverImage) {
      coverImageUrl = await this.uploadCoverImage(user.id, coverImage);
    }

    // Insert audio story with all new fields
    const { data: story, error: storyError } = await this.supabase
      .from('stories')
      .insert({
        title: storyData.title,
        content: null,
        description: storyData.description,
        cover_image_url: coverImageUrl,
        main_characters: storyData.main_characters || [],
        genre: storyData.genre,
        language: storyData.language || 'en',
        locality_id: storyData.locality_id,
        author_id: user.id,
        status: 'pending',
        story_type: 'audio',
        audio_url: publicUrl.publicUrl,
        audio_duration: duration
      })
      .select()
      .single();

    if (storyError) throw storyError;

    // Handle tags
    if (tags.length > 0) {
      const storyTags = [];
      for (const tag of tags) {
        const createdTag = await this.createOrGetTag(tag.name);
        storyTags.push({
          story_id: story.id,
          tag_id: createdTag.id
        });
      }

      const { error: tagsError } = await this.supabase
        .from('story_tags')
        .insert(storyTags);

      if (tagsError) throw tagsError;
    }

    // Publish story created event
    this.eventBus.publish({
      type: EventType.STORY_CREATED,
      payload: { story, authorId: user.id }
    });

    return story;
  }
}
