import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { StoryService } from '../../services/story.service';

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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private storyService: StoryService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    const storyId = this.route.snapshot.paramMap.get('id');
    if (storyId) {
      this.loadStory(storyId);
    }
  }

  async loadStory(id: string): Promise<void> {
    try {
      this.isLoading = true;
      this.story = await this.storyService.getStoryById(id);
      console.log('Story loaded:', this.story);
      console.log('Story images:', this.story?.story_images);
      console.log('Has inline images:', this.hasInlineImages());
      this.isLoading = false;
    } catch (error: any) {
      this.errorMessage = error.message || 'Failed to load story';
      this.isLoading = false;
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
