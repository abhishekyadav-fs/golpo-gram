import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { StoryService } from '../../services/story.service';
import { LocalityService } from '../../services/locality.service';
import { AuthService } from '../../services/auth.service';
import { Story, Locality } from '../../models/story.model';

@Component({
  selector: 'app-feed',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './feed.component.html',
  styleUrls: ['./feed.component.scss']
})
export class FeedComponent implements OnInit {
  stories: Story[] = [];
  localities: Locality[] = [];
  selectedLocalityId: string = '';
  selectedType: string = 'all';
  viewMode: 'grid' | 'list' = 'grid';
  isLoading = false;
  isLoadingMore = false;
  errorMessage = '';
  noStoriesMessage = '';
  expandedStories: Set<string> = new Set();
  private page = 0;
  private pageSize = 10;
  private hasMore = true;

  constructor(
    private storyService: StoryService,
    private localityService: LocalityService,
    public authService: AuthService,
    private router: Router
  ) {}

  @HostListener('window:scroll', ['$event'])
  onScroll() {
    const scrollPosition = window.innerHeight + window.scrollY;
    const documentHeight = document.documentElement.scrollHeight;
    
    // Load more when user scrolls to 80% of the page
    if (scrollPosition >= documentHeight * 0.8 && !this.isLoadingMore && this.hasMore) {
      this.loadMoreStories();
    }
  }

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
    this.noStoriesMessage = '';
    this.page = 0;
    this.hasMore = true;
    this.stories = [];

    try {
      this.stories = await this.storyService.getStoriesByLocality(this.selectedLocalityId);
      
      // Check if no stories were returned
      if (this.stories.length === 0) {
        const selectedLocality = this.localities.find(l => l.id === this.selectedLocalityId);
        this.noStoriesMessage = `No stories available for ${selectedLocality?.name || 'this locality'} yet. Be the first to share!`;
        this.hasMore = false;
      } else if (this.stories.length < this.pageSize) {
        this.hasMore = false;
      }
    } catch (error: any) {
      console.error('Error loading stories:', error);
      this.errorMessage = 'Failed to load stories. Please try again later.';
    } finally {
      this.isLoading = false;
    }
  }

  async loadMoreStories() {
    if (!this.selectedLocalityId || !this.hasMore) return;

    this.isLoadingMore = true;
    this.page++;

    try {
      const moreStories = await this.storyService.getStoriesByLocality(
        this.selectedLocalityId, 
        'approved'
      );
      
      if (moreStories.length === 0 || moreStories.length < this.pageSize) {
        this.hasMore = false;
      }
      
      // Add new stories that aren't already in the list
      const newStories = moreStories.filter(
        story => !this.stories.some(s => s.id === story.id)
      );
      
      this.stories = [...this.stories, ...newStories];
    } catch (error: any) {
      console.error('Error loading more stories:', error);
      this.page--;
    } finally {
      this.isLoadingMore = false;
    }
  }

  onLocalityChange() {
    this.loadStories();
  }

  viewStory(storyId: string) {
    this.router.navigate(['/story', storyId]);
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

  getPreviewContent(content: string, storyId: string): string {
    if (this.expandedStories.has(storyId) || content.length <= 200) {
      return content;
    }
    return content.substring(0, 200) + '...';
  }

  shouldShowReadMore(content: string, storyId: string): boolean {
    return content.length > 200 && !this.expandedStories.has(storyId);
  }

  toggleExpand(event: Event, storyId: string) {
    event.stopPropagation();
    if (this.expandedStories.has(storyId)) {
      this.expandedStories.delete(storyId);
    } else {
      this.expandedStories.add(storyId);
    }
  }

  filterByType(type: string) {
    this.selectedType = type;
    // TODO: Implement filtering logic based on media type
    // For now, this just sets the active state
    console.log('Filter by type:', type);
  }

  logout() {
    this.authService.signOut();
    this.router.navigate(['/login']);
  }
}
