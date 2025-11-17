import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { StoryService } from '../../services/story.service';
import { AuthService } from '../../services/auth.service';
import { Story } from '../../models/story.model';

@Component({
  selector: 'app-my-stories',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './my-stories.component.html',
  styleUrls: ['./my-stories.component.scss']
})
export class MyStoriesComponent implements OnInit {
  stories: Story[] = [];
  isLoading = false;
  errorMessage = '';

  constructor(
    private storyService: StoryService,
    private authService: AuthService,
    private router: Router
  ) {}

  async ngOnInit() {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    await this.loadMyStories();
  }

  async loadMyStories() {
    this.isLoading = true;
    this.errorMessage = '';

    try {
      this.stories = await this.storyService.getMyStories();
    } catch (error: any) {
      this.errorMessage = 'Failed to load your stories';
    } finally {
      this.isLoading = false;
    }
  }

  getStatusClass(status: string): string {
    return `status-${status}`;
  }

  getStatusLabel(status: string): string {
    return status.charAt(0).toUpperCase() + status.slice(1);
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
}
