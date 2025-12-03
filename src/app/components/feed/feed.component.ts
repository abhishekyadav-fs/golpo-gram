import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { StoryService } from '../../services/story.service';
import { LocalityService } from '../../services/locality.service';
import { StorytellerService } from '../../services/storyteller.service';
import { AuthService } from '../../services/auth.service';
import { Story, Locality } from '../../models/story.model';
import { Storyteller } from '../../models/storyteller.model';

@Component({
  selector: 'app-feed',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './feed.component.html',
  styleUrls: ['./feed.component.scss']
})
export class FeedComponent implements OnInit {
  stories: Story[] = [];
  allStories: Story[] = [];
  localities: Locality[] = [];
  filteredLocalities: Locality[] = [];
  selectedLocalityId: string = '';
  selectedLocalityName: string = '';
  localitySearch: string = '';
  showLocalityDropdown: boolean = false;
  selectedType: string = 'all';
  viewMode: 'grid' | 'list' = 'grid';
  isLoading = false;
  isLoadingMore = false;
  errorMessage = '';
  noStoriesMessage = '';
  expandedStories: Set<string> = new Set();
  storytellerSearch: string = '';
  private page = 0;
  private pageSize = 10;
  private hasMore = true;

  constructor(
    private storyService: StoryService,
    private localityService: LocalityService,
    private storytellerService: StorytellerService,
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
      this.filteredLocalities = this.localities.slice(0, 3); // Show first 3 initially
      if (this.localities.length > 0) {
        this.selectedLocalityId = this.localities[0].id;
        this.selectedLocalityName = this.localities[0].name;
        this.localitySearch = this.localities[0].name;
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
    this.allStories = [];

    try {
      this.allStories = await this.storyService.getStoriesByLocality(this.selectedLocalityId);
      this.applyFilters();
      
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

  applyFilters() {
    let filtered = [...this.allStories];

    // Filter by story type (text, audio, or all)
    if (this.selectedType !== 'all') {
      filtered = filtered.filter(story => story.story_type === this.selectedType);
    }

    // Filter by storyteller search
    if (this.storytellerSearch.trim()) {
      const searchTerm = this.storytellerSearch.toLowerCase();
      filtered = filtered.filter(story => 
        story.author_name?.toLowerCase().includes(searchTerm)
      );
    }

    this.stories = filtered;
    
    if (this.stories.length === 0) {
      if (this.storytellerSearch.trim()) {
        this.noStoriesMessage = `No stories found for storyteller "${this.storytellerSearch}"`;
      } else if (this.selectedType !== 'all') {
        const selectedLocality = this.localities.find(l => l.id === this.selectedLocalityId);
        const typeLabel = this.selectedType === 'text' ? 'text' : 'audio';
        this.noStoriesMessage = `No ${typeLabel} stories available for ${selectedLocality?.name || 'this locality'} yet.`;
      } else {
        const selectedLocality = this.localities.find(l => l.id === this.selectedLocalityId);
        this.noStoriesMessage = `No stories available for ${selectedLocality?.name || 'this locality'} yet. Be the first to share!`;
      }
    } else {
      this.noStoriesMessage = '';
    }
  }

  onStorytellerSearch() {
    this.applyFilters();
  }

  clearSearch() {
    this.storytellerSearch = '';
    this.applyFilters();
  }

  onLocalitySearchInput() {
    const searchTerm = this.localitySearch.trim().toLowerCase();
    
    if (searchTerm.length < 2) {
      // Show first 3 localities if less than 2 characters
      this.filteredLocalities = this.localities.slice(0, 3);
      this.showLocalityDropdown = false;
    } else {
      // Filter localities and show top 3 matches
      this.filteredLocalities = this.localities
        .filter(loc => loc.name.toLowerCase().includes(searchTerm))
        .slice(0, 3);
      this.showLocalityDropdown = this.filteredLocalities.length > 0;
    }
  }

  selectLocality(locality: Locality) {
    this.selectedLocalityId = locality.id;
    this.selectedLocalityName = locality.name;
    this.localitySearch = locality.name;
    this.showLocalityDropdown = false;
    this.onLocalityChange();
  }

  onLocalityInputFocus() {
    if (this.localitySearch.trim().length >= 2) {
      this.onLocalitySearchInput();
    }
  }

  onLocalityInputBlur() {
    // Delay to allow click on dropdown item
    setTimeout(() => {
      this.showLocalityDropdown = false;
      // Restore selected locality name if search was cleared
      if (!this.localitySearch.trim()) {
        this.localitySearch = this.selectedLocalityName;
      }
    }, 200);
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

  getPreviewContent(content: string | undefined, storyId: string): string {
    if (!content) return '';
    if (this.expandedStories.has(storyId) || content.length <= 200) {
      return content;
    }
    return content.substring(0, 200) + '...';
  }

  shouldShowReadMore(content: string | undefined, storyId: string): boolean {
    if (!content) return false;
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
    this.applyFilters();
  }

  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  logout() {
    this.authService.signOut();
    this.router.navigate(['/login']);
  }
}
