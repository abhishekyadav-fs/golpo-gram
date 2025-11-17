import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StoryService } from '../../services/story.service';
import { AuthService } from '../../services/auth.service';
import { Story } from '../../models/story.model';

@Component({
  selector: 'app-moderation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './moderation.component.html',
  styleUrls: ['./moderation.component.scss']
})
export class ModerationComponent implements OnInit {
  pendingStories: Story[] = [];
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  selectedStory: Story | null = null;
  moderationNotes: string = '';

  constructor(
    private storyService: StoryService,
    private authService: AuthService,
    private router: Router
  ) {}

  async ngOnInit() {
    if (!this.authService.isModerator()) {
      this.router.navigate(['/feed']);
      return;
    }

    await this.loadPendingStories();
  }

  async loadPendingStories() {
    this.isLoading = true;
    this.errorMessage = '';

    try {
      this.pendingStories = await this.storyService.getPendingStories();
    } catch (error: any) {
      this.errorMessage = 'Failed to load pending stories';
    } finally {
      this.isLoading = false;
    }
  }

  selectStory(story: Story) {
    this.selectedStory = story;
    this.moderationNotes = '';
    this.successMessage = '';
  }

  async moderateStory(status: 'approved' | 'rejected') {
    if (!this.selectedStory) return;

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      await this.storyService.moderateStory(
        this.selectedStory.id!,
        status,
        this.moderationNotes
      );

      this.successMessage = `Story ${status} successfully!`;
      
      // Remove from pending list
      this.pendingStories = this.pendingStories.filter(s => s.id !== this.selectedStory!.id);
      this.selectedStory = null;
      this.moderationNotes = '';
    } catch (error: any) {
      this.errorMessage = 'Failed to moderate story';
    } finally {
      this.isLoading = false;
    }
  }

  formatDate(date: Date | undefined): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  closeDetail() {
    this.selectedStory = null;
    this.moderationNotes = '';
    this.successMessage = '';
    this.errorMessage = '';
  }
}
