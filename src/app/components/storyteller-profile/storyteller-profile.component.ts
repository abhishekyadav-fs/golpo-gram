import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { StorytellerService } from '../../services/storyteller.service';
import { StoryService } from '../../services/story.service';
import { Storyteller } from '../../models/storyteller.model';
import { Story } from '../../models/story.model';

@Component({
  selector: 'app-storyteller-profile',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './storyteller-profile.component.html',
  styleUrls: ['./storyteller-profile.component.scss']
})
export class StorytellerProfileComponent implements OnInit {
  storyteller: Storyteller | null = null;
  stories: Story[] = [];
  isLoading = true;
  error = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private storytellerService: StorytellerService,
    private storyService: StoryService
  ) {}

  async ngOnInit() {
    const storytellerId = this.route.snapshot.paramMap.get('id');
    if (!storytellerId) {
      this.error = 'Storyteller not found';
      this.isLoading = false;
      return;
    }

    await this.loadStorytellerProfile(storytellerId);
  }

  async loadStorytellerProfile(storytellerId: string) {
    try {
      this.isLoading = true;
      
      // Load storyteller profile
      this.storyteller = await this.storytellerService.getStorytellerProfile(storytellerId);
      
      if (!this.storyteller) {
        this.error = 'Storyteller not found';
        return;
      }

      // Load storyteller's stories
      this.stories = await this.storyService.getStoriesByAuthor(storytellerId);
      
    } catch (error) {
      console.error('Error loading storyteller profile:', error);
      this.error = 'Failed to load storyteller profile';
    } finally {
      this.isLoading = false;
    }
  }

  getProfileImage(): string {
    return this.storyteller?.storyteller_photo_url || 'assets/default-avatar.svg';
  }

  formatDate(date: Date | undefined): string {
    if (!date) return 'Unknown';
    return new Date(date).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    });
  }

  viewStory(storyId: string) {
    this.router.navigate(['/story', storyId]);
  }

  getPreviewContent(content: string | undefined | null): string {
    if (!content) return '';
    return content.length > 200 ? content.substring(0, 200) + '...' : content;
  }
}
