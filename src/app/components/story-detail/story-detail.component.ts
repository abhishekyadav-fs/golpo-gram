import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { StoryService } from '../../services/story.service';
import { StoryReviewService, StoryStats } from '../../services/story-review.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-story-detail',
  imports: [CommonModule],
  templateUrl: './story-detail.component.html',
  styleUrl: './story-detail.component.scss'
})
export class StoryDetailComponent implements OnInit {
  story: any = null;
  isLoading = true;
  errorMessage = '';
  currentUserId: string | null = null;
  userReview: 'thumbs_up' | 'thumbs_down' | null = null;
  storyStats: StoryStats = {
    total_reads: 0,
    thumbs_up: 0,
    thumbs_down: 0,
    thumbs_up_percentage: 0,
    thumbs_down_percentage: 0
  };
  isSubmittingReview = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private storyService: StoryService,
    private reviewService: StoryReviewService,
    private authService: AuthService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    const storyId = this.route.snapshot.paramMap.get('id');
    if (storyId) {
      this.initialize(storyId);
    }
  }

  async initialize(storyId: string): Promise<void> {
    await this.getCurrentUser();
    await this.loadStory(storyId);
  }

  async getCurrentUser(): Promise<void> {
    const user = await this.authService.getCurrentUser();
    this.currentUserId = user?.id || null;
  }

  async loadStory(id: string): Promise<void> {
    try {
      this.isLoading = true;
      this.story = await this.storyService.getStoryById(id);
      console.log('Story loaded:', this.story);
      console.log('Story images:', this.story?.story_images);
      console.log('Has inline images:', this.hasInlineImages());
      
      // Track read
      await this.trackStoryRead(id);
      
      // Load stats and user review
      await this.loadStoryStats(id);
      if (this.currentUserId) {
        await this.loadUserReview(id);
      }
      
      this.isLoading = false;
    } catch (error: any) {
      this.errorMessage = error.message || 'Failed to load story';
      this.isLoading = false;
    }
  }

  async trackStoryRead(storyId: string): Promise<void> {
    try {
      await this.reviewService.trackRead(storyId, this.currentUserId || undefined);
    } catch (error) {
      console.error('Error tracking read:', error);
    }
  }

  async loadStoryStats(storyId: string): Promise<void> {
    try {
      this.storyStats = await this.reviewService.getStoryStats(storyId);
    } catch (error) {
      console.error('Error loading story stats:', error);
    }
  }

  async loadUserReview(storyId: string): Promise<void> {
    if (!this.currentUserId) return;
    
    try {
      const review = await this.reviewService.getUserReview(storyId, this.currentUserId);
      this.userReview = review?.review_type || null;
    } catch (error) {
      console.error('Error loading user review:', error);
    }
  }

  async submitReview(reviewType: 'thumbs_up' | 'thumbs_down'): Promise<void> {
    if (!this.currentUserId) {
      this.errorMessage = 'Please log in to submit a review';
      return;
    }

    // Don't allow if already reviewed
    if (this.userReview) {
      return;
    }

    if (this.isSubmittingReview) return;

    try {
      this.isSubmittingReview = true;
      
      // Submit review (one-time only)
      await this.reviewService.submitReview(this.story.id, this.currentUserId, reviewType);
      this.userReview = reviewType;
      
      // Reload stats
      await this.loadStoryStats(this.story.id);
      
      this.isSubmittingReview = false;
    } catch (error: any) {
      console.error('Error submitting review:', error);
      this.errorMessage = error.message || 'Failed to submit review';
      this.isSubmittingReview = false;
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  getStoryContentWithImages(): SafeHtml {
    if (!this.story || !this.story.content) return '';
    
    // If story has inline images, the content is HTML with image placeholders
    if (this.story.story_images && this.story.story_images.length > 0) {
      let content = this.story.content;
      
      // Replace any placeholder image tags with actual images
      this.story.story_images.forEach((img: any, index: number) => {
        const placeholder = `data-image-index="${index}"`;
        if (content.includes(placeholder)) {
          const imgTag = `<div class="story-inline-image" data-image-index="${index}">
            <img src="${img.image_url}" alt="${img.image_caption || 'Story image'}"/>
            ${img.image_caption ? `<p class="image-caption">${img.image_caption}</p>` : ''}
          </div>`;
          content = content.replace(new RegExp(`<div[^>]*${placeholder}[^>]*>.*?</div>`, 'gs'), imgTag);
        }
      });
      
      // Bypass security since we trust the content (it's from our database)
      return this.sanitizer.bypassSecurityTrustHtml(content);
    }
    
    return this.story.content;
  }

  hasInlineImages(): boolean {
    return this.story && this.story.story_images && this.story.story_images.length > 0;
  }

  goToStorytellerProfile(): void {
    if (this.story && this.story.author_id) {
      this.router.navigate(['/storyteller', this.story.author_id]);
    }
  }

  goBack(): void {
    this.router.navigate(['/feed']);
  }
}
