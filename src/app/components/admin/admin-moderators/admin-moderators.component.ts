import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../services/admin.service';
import { Moderator, ModeratorActivity, AdminUser } from '../../../models/admin.model';

@Component({
  selector: 'app-admin-moderators',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-moderators.component.html',
  styleUrl: './admin-moderators.component.scss'
})
export class AdminModeratorsComponent implements OnInit {
  moderators: Moderator[] = [];
  isLoading: boolean = false;
  error: string = '';
  selectedModerator: Moderator | null = null;
  showActivity: boolean = false;
  moderatorActivity: ModeratorActivity[] = [];
  showAddModal: boolean = false;
  searchTerm: string = '';
  searchResults: AdminUser[] = [];
  searchingUsers: boolean = false;

  constructor(private adminService: AdminService) {}

  ngOnInit() {
    this.loadModerators();
  }

  async loadModerators() {
    this.isLoading = true;
    this.error = '';
    try {
      this.moderators = await this.adminService.getAllModerators();
    } catch (err) {
      this.error = 'Failed to load moderators';
      console.error(err);
    } finally {
      this.isLoading = false;
    }
  }

  async viewActivity(moderator: Moderator) {
    this.selectedModerator = moderator;
    this.showActivity = true;
    try {
      this.moderatorActivity = await this.adminService.getModeratorActivity(moderator.id);
    } catch (err) {
      alert('Failed to load moderator activity');
      console.error(err);
    }
  }

  closeActivity() {
    this.selectedModerator = null;
    this.showActivity = false;
    this.moderatorActivity = [];
  }

  async removeModerator(moderator: Moderator) {
    if (!confirm(`Are you sure you want to remove ${moderator.full_name} as a moderator?`)) {
      return;
    }

    try {
      await this.adminService.removeModerator(moderator.id);
      await this.loadModerators();
    } catch (err) {
      alert('Failed to remove moderator');
      console.error(err);
    }
  }

  openAddModal() {
    this.showAddModal = true;
    this.searchTerm = '';
    this.searchResults = [];
  }

  closeAddModal() {
    this.showAddModal = false;
    this.searchTerm = '';
    this.searchResults = [];
  }

  async searchUsers() {
    if (!this.searchTerm.trim()) {
      this.searchResults = [];
      return;
    }

    this.searchingUsers = true;
    try {
      const users = await this.adminService.searchUsers(this.searchTerm);
      // Filter out existing moderators
      const moderatorIds = this.moderators.map(m => m.id);
      this.searchResults = users.filter(u => !moderatorIds.includes(u.id) && !u.is_moderator);
    } catch (err) {
      alert('Failed to search users');
      console.error(err);
    } finally {
      this.searchingUsers = false;
    }
  }

  async addModerator(user: AdminUser) {
    try {
      await this.adminService.addModerator({ user_id: user.id });
      this.closeAddModal();
      await this.loadModerators();
    } catch (err) {
      alert('Failed to add moderator');
      console.error(err);
    }
  }

  getProfileImage(moderator: Moderator): string {
    return moderator.profile_image_url || 'assets/default-avatar.svg';
  }

  formatDate(date: string): string {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  formatDateTime(date: string): string {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
