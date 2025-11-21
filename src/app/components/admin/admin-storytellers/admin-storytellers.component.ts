import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AdminService } from '../../../services/admin.service';
import { StoryService } from '../../../services/story.service';
import { EventBusService, EventType } from '../../../services/event-bus.service';
import { Storyteller } from '../../../models/admin.model';
import { Story } from '../../../models/story.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-admin-storytellers',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin-storytellers.component.html',
  styleUrl: './admin-storytellers.component.scss'
})
export class AdminStorytellersComponent implements OnInit, OnDestroy {
  storytellers: Storyteller[] = [];
  filteredStorytellers: Storyteller[] = [];
  searchTerm: string = '';
  isLoading: boolean = false;
  error: string = '';
  selectedStoryteller: Storyteller | null = null;
  showDeleteConfirm: boolean = false;
  deleteReason: string = '';
  showStoriesModal: boolean = false;
  storytellerStories: Story[] = [];
  loadingStories: boolean = false;
  selectedStory: Story | null = null;
  showDeleteStoryConfirm: boolean = false;
  private eventSubscriptions: Subscription[] = [];

  constructor(
    private adminService: AdminService,
    private storyService: StoryService,
    private eventBus: EventBusService
  ) {}

  ngOnInit() {
    this.loadStorytellers();
    this.subscribeToEvents();
  }

  ngOnDestroy() {
    // Clean up subscriptions
    this.eventSubscriptions.forEach(sub => sub.unsubscribe());
  }

  private subscribeToEvents() {
    // Listen for story approved/rejected events
    const storyApprovedSub = this.eventBus.on(EventType.STORY_APPROVED).subscribe((payload) => {
      this.handleStoryModerated(payload);
    });

    const storyRejectedSub = this.eventBus.on(EventType.STORY_REJECTED).subscribe((payload) => {
      this.handleStoryModerated(payload);
    });

    // Listen for story created events
    const storyCreatedSub = this.eventBus.on(EventType.STORY_CREATED).subscribe((payload) => {
      this.handleStoryCreated(payload);
    });

    // Listen for story deleted events
    const storyDeletedSub = this.eventBus.on(EventType.STORY_DELETED).subscribe((payload) => {
      this.handleStoryDeleted(payload);
    });

    this.eventSubscriptions.push(storyApprovedSub, storyRejectedSub, storyCreatedSub, storyDeletedSub);
  }

  private handleStoryModerated(payload: any) {
    // Refresh storyteller stats when a story is moderated
    const storyteller = this.storytellers.find(st => st.id === payload.story?.author_id);
    if (storyteller) {
      // Reload this specific storyteller's data to get updated stats
      this.adminService.getStorytellerById(storyteller.id).then(updated => {
        if (updated) {
          const index = this.storytellers.findIndex(st => st.id === storyteller.id);
          if (index !== -1) {
            this.storytellers[index] = updated;
            this.onSearch(); // Refresh filtered list
          }
        }
      });
    }
  }

  private handleStoryCreated(payload: any) {
    // Refresh storyteller stats when a new story is created
    const storyteller = this.storytellers.find(st => st.id === payload.authorId);
    if (storyteller) {
      this.adminService.getStorytellerById(storyteller.id).then(updated => {
        if (updated) {
          const index = this.storytellers.findIndex(st => st.id === storyteller.id);
          if (index !== -1) {
            this.storytellers[index] = updated;
            this.onSearch();
          }
        }
      });
    }
  }

  private handleStoryDeleted(payload: any) {
    // Refresh storyteller stats when a story is deleted
    if (payload.authorId) {
      const storyteller = this.storytellers.find(st => st.id === payload.authorId);
      if (storyteller) {
        this.adminService.getStorytellerById(storyteller.id).then(updated => {
          if (updated) {
            const index = this.storytellers.findIndex(st => st.id === storyteller.id);
            if (index !== -1) {
              this.storytellers[index] = updated;
              this.onSearch();
            }
          }
        });
      }
    }
  }

  async loadStorytellers() {
    this.isLoading = true;
    this.error = '';
    try {
      this.storytellers = await this.adminService.getAllStorytellers();
      this.filteredStorytellers = this.storytellers;
    } catch (err) {
      this.error = 'Failed to load storytellers';
      console.error(err);
    } finally {
      this.isLoading = false;
    }
  }

  onSearch() {
    if (!this.searchTerm.trim()) {
      this.filteredStorytellers = this.storytellers;
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredStorytellers = this.storytellers.filter(st => 
      st.storyteller_name?.toLowerCase().includes(term) ||
      st.full_name?.toLowerCase().includes(term) ||
      st.email?.toLowerCase().includes(term)
    );
  }

  async toggleBlockStoryteller(storyteller: Storyteller) {
    if (storyteller.is_blocked) {
      await this.unblockStoryteller(storyteller);
    } else {
      await this.blockStoryteller(storyteller);
    }
  }

  async blockStoryteller(storyteller: Storyteller) {
    const reason = prompt('Enter reason for blocking (optional):');
    try {
      await this.adminService.blockStoryteller(storyteller.id, reason || undefined);
      await this.loadStorytellers();
    } catch (err) {
      alert('Failed to block storyteller');
      console.error(err);
    }
  }

  async unblockStoryteller(storyteller: Storyteller) {
    try {
      await this.adminService.unblockUser(storyteller.id);
      await this.loadStorytellers();
    } catch (err) {
      alert('Failed to unblock storyteller');
      console.error(err);
    }
  }

  confirmDelete(storyteller: Storyteller) {
    this.selectedStoryteller = storyteller;
    this.showDeleteConfirm = true;
  }

  cancelDelete() {
    this.selectedStoryteller = null;
    this.showDeleteConfirm = false;
    this.deleteReason = '';
  }

  async deleteStoryteller() {
    if (!this.selectedStoryteller) return;

    try {
      await this.adminService.deleteStoryteller(this.selectedStoryteller.id, this.deleteReason || undefined);
      this.showDeleteConfirm = false;
      this.selectedStoryteller = null;
      this.deleteReason = '';
      await this.loadStorytellers();
    } catch (err) {
      alert('Failed to delete storyteller');
      console.error(err);
    }
  }

  getProfileImage(storyteller: Storyteller): string {
    return storyteller.storyteller_photo_url || 'assets/default-avatar.svg';
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  async viewStories(storyteller: Storyteller) {
    this.selectedStoryteller = storyteller;
    this.showStoriesModal = true;
    this.loadingStories = true;
    try {
      this.storytellerStories = await this.storyService.getStoriesByAuthor(storyteller.id, '');
    } catch (err) {
      alert('Failed to load stories');
      console.error(err);
      this.storytellerStories = [];
    } finally {
      this.loadingStories = false;
    }
  }

  closeStoriesModal() {
    this.showStoriesModal = false;
    this.selectedStoryteller = null;
    this.storytellerStories = [];
  }

  confirmDeleteStory(story: Story) {
    this.selectedStory = story;
    this.showDeleteStoryConfirm = true;
  }

  cancelDeleteStory() {
    this.selectedStory = null;
    this.showDeleteStoryConfirm = false;
  }

  async deleteStory() {
    if (!this.selectedStory || !this.selectedStory.id) return;

    try {
      await this.adminService.deleteStory(this.selectedStory.id);
      this.showDeleteStoryConfirm = false;
      this.selectedStory = null;
      // Refresh the stories list
      if (this.selectedStoryteller) {
        await this.viewStories(this.selectedStoryteller);
        await this.loadStorytellers();
      }
    } catch (err) {
      alert('Failed to delete story');
      console.error(err);
    }
  }

  getStoryStatusBadge(status: string): string {
    return status;
  }

  getPreviewContent(story: Story): string {
    if (story.story_type === 'text') {
      return story.content?.substring(0, 150) + '...' || '';
    } else {
      return `Audio story (${story.media_files?.length || 0} file${story.media_files?.length !== 1 ? 's' : ''})`;
    }
  }
}
