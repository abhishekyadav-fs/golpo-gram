import { Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';

export interface StoryReview {
  id?: string;
  story_id: string;
  user_id: string;
  review_type: 'thumbs_up' | 'thumbs_down';
  created_at?: string;
  updated_at?: string;
}

export interface StoryRead {
  id?: string;
  story_id: string;
  user_id?: string;
  ip_address?: string;
  user_agent?: string;
  read_at?: string;
}

export interface StoryStats {
  total_reads: number;
  thumbs_up: number;
  thumbs_down: number;
  thumbs_up_percentage: number;
  thumbs_down_percentage: number;
}

@Injectable({
  providedIn: 'root'
})
export class StoryReviewService {
  private supabase: SupabaseClient;

  constructor(private supabaseService: SupabaseService) {
    this.supabase = this.supabaseService.getClient();
  }

  // Submit a review (one-time only, not editable)
  async submitReview(storyId: string, userId: string, reviewType: 'thumbs_up' | 'thumbs_down'): Promise<any> {
    try {
      // First check if user has already reviewed
      const existing = await this.getUserReview(storyId, userId);
      if (existing) {
        throw new Error('You have already reviewed this story');
      }

      // Insert the review
      const { data, error } = await this.supabase
        .from('story_reviews')
        .insert({ 
          story_id: storyId, 
          user_id: userId, 
          review_type: reviewType 
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Error submitting review:', error);
      throw error;
    }
  }

  // Get user's review for a story
  async getUserReview(storyId: string, userId: string): Promise<StoryReview | null> {
    try {
      const { data, error } = await this.supabase
        .from('story_reviews')
        .select('*')
        .eq('story_id', storyId)
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "not found"
      return data;
    } catch (error: any) {
      console.error('Error getting user review:', error);
      return null;
    }
  }

  // Track a story read
  async trackRead(storyId: string, userId?: string): Promise<void> {
    try {
      // Get user agent and browser fingerprint
      const userAgent = navigator.userAgent;
      const fingerprint = await this.generateFingerprint();
      
      // Get IP address from client (note: this may not be accurate due to proxies/VPNs)
      // For production, use a server-side Edge Function to get real IP
      const ipAddress = await this.getClientIP();

      // Insert read with IP + fingerprint combination for uniqueness
      // The unique index on (story_id, ip_address, browser_fingerprint) will prevent duplicates
      const { error } = await this.supabase
        .from('story_reads')
        .insert({ 
          story_id: storyId, 
          user_id: userId || null,
          ip_address: ipAddress,
          user_agent: userAgent,
          browser_fingerprint: fingerprint
        });

      if (error && error.code !== '23505') {
        console.error('Error tracking read:', error);
      }
    } catch (error: any) {
      // Silently fail for read tracking - it's not critical
      console.error('Error tracking read:', error);
    }
  }

  // Get client IP address (best effort)
  private async getClientIP(): Promise<string> {
    try {
      // Use a free IP API service
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip || '';
    } catch (error) {
      // Fallback: return empty string if IP fetch fails
      return '';
    }
  }

  // Generate browser fingerprint for anonymous user tracking
  private async generateFingerprint(): Promise<string> {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const txt = 'fingerprint';
      
      if (ctx) {
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText(txt, 2, 2);
      }

      const fingerprint = [
        navigator.userAgent,
        navigator.language,
        screen.colorDepth,
        screen.width + 'x' + screen.height,
        new Date().getTimezoneOffset(),
        canvas.toDataURL(),
        navigator.hardwareConcurrency || 0,
        navigator.platform
      ].join('|');

      // Create a simple hash
      let hash = 0;
      for (let i = 0; i < fingerprint.length; i++) {
        const char = fingerprint.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      
      return Math.abs(hash).toString(36);
    } catch (error) {
      // Fallback to timestamp-based fingerprint
      return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
  }

  // Get story statistics
  async getStoryStats(storyId: string): Promise<StoryStats> {
    try {
      // Get review counts
      const { data: reviews, error: reviewError } = await this.supabase
        .from('story_reviews')
        .select('review_type')
        .eq('story_id', storyId);

      if (reviewError) throw reviewError;

      const thumbsUp = reviews?.filter(r => r.review_type === 'thumbs_up').length || 0;
      const thumbsDown = reviews?.filter(r => r.review_type === 'thumbs_down').length || 0;
      const totalReviews = thumbsUp + thumbsDown;

      // Get read count
      const { count: readCount, error: readError } = await this.supabase
        .from('story_reads')
        .select('*', { count: 'exact', head: true })
        .eq('story_id', storyId);

      if (readError) throw readError;

      return {
        total_reads: readCount || 0,
        thumbs_up: thumbsUp,
        thumbs_down: thumbsDown,
        thumbs_up_percentage: totalReviews > 0 ? Math.round((thumbsUp / totalReviews) * 100) : 0,
        thumbs_down_percentage: totalReviews > 0 ? Math.round((thumbsDown / totalReviews) * 100) : 0
      };
    } catch (error: any) {
      console.error('Error getting story stats:', error);
      return {
        total_reads: 0,
        thumbs_up: 0,
        thumbs_down: 0,
        thumbs_up_percentage: 0,
        thumbs_down_percentage: 0
      };
    }
  }
}
