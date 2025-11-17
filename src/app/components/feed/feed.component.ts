import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StoryService } from '../../services/story.service';
import { LocalityService } from '../../services/locality.service';
import { AuthService } from '../../services/auth.service';
import { Story, Locality } from '../../models/story.model';

@Component({
  selector: 'app-feed',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './feed.component.html',
  styleUrls: ['./feed.component.scss']
})
export class FeedComponent implements OnInit {
  stories: Story[] = [];
  localities: Locality[] = [];
  selectedLocalityId: string = '';
  isLoading = false;
  errorMessage = '';

  constructor(
    private storyService: StoryService,
    private localityService: LocalityService,
    public authService: AuthService,
    private router: Router
  ) {}

  async ngOnInit() {
    await this.loadLocalities();
  }

  async loadLocalities() {
    try {
      this.localities = await this.localityService.getLocalities();
      if (this.localities.length > 0) {
        this.selectedLocalityId = this.localities[0].id;
        await this.loadStories();
      }
    } catch (error: any) {
      this.errorMessage = 'Failed to load localities';
    }
  }

  async loadStories() {
    if (!this.selectedLocalityId) return;

    this.isLoading = true;
    this.errorMessage = '';

    try {
      this.stories = await this.storyService.getStoriesByLocality(this.selectedLocalityId);
    } catch (error: any) {
      this.errorMessage = 'Failed to load stories';
    } finally {
      this.isLoading = false;
    }
  }

  onLocalityChange() {
    this.loadStories();
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

  navigateToCreate() {
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/create-story']);
    } else {
      this.router.navigate(['/login']);
    }
  }

  logout() {
    this.authService.signOut();
    this.router.navigate(['/login']);
  }
}
