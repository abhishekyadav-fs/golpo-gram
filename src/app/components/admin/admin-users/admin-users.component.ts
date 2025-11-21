import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AdminService } from '../../../services/admin.service';
import { AdminUser } from '../../../models/admin.model';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin-users.component.html',
  styleUrl: './admin-users.component.scss'
})
export class AdminUsersComponent implements OnInit {
  users: AdminUser[] = [];
  filteredUsers: AdminUser[] = [];
  searchTerm: string = '';
  isLoading: boolean = false;
  error: string = '';
  selectedUser: AdminUser | null = null;
  showDeleteConfirm: boolean = false;
  deleteReason: string = '';
  blockReason: string = '';

  constructor(private adminService: AdminService) {}

  ngOnInit() {
    this.loadUsers();
  }

  async loadUsers() {
    this.isLoading = true;
    this.error = '';
    try {
      this.users = await this.adminService.getAllUsers();
      this.filteredUsers = this.users;
    } catch (err) {
      this.error = 'Failed to load users';
      console.error(err);
    } finally {
      this.isLoading = false;
    }
  }

  onSearch() {
    if (!this.searchTerm.trim()) {
      this.filteredUsers = this.users;
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredUsers = this.users.filter(user => 
      user.full_name?.toLowerCase().includes(term) ||
      user.email?.toLowerCase().includes(term)
    );
  }

  async toggleBlockUser(user: AdminUser) {
    if (user.is_blocked) {
      await this.unblockUser(user);
    } else {
      await this.blockUser(user);
    }
  }

  async blockUser(user: AdminUser) {
    const reason = prompt('Enter reason for blocking (optional):');
    try {
      await this.adminService.blockUser({ user_id: user.id, reason: reason || undefined });
      await this.loadUsers();
    } catch (err) {
      alert('Failed to block user');
      console.error(err);
    }
  }

  async unblockUser(user: AdminUser) {
    try {
      await this.adminService.unblockUser(user.id);
      await this.loadUsers();
    } catch (err) {
      alert('Failed to unblock user');
      console.error(err);
    }
  }

  confirmDelete(user: AdminUser) {
    this.selectedUser = user;
    this.showDeleteConfirm = true;
  }

  cancelDelete() {
    this.selectedUser = null;
    this.showDeleteConfirm = false;
    this.deleteReason = '';
  }

  async deleteUser() {
    if (!this.selectedUser) return;

    try {
      await this.adminService.deleteUser({ 
        user_id: this.selectedUser.id, 
        reason: this.deleteReason || undefined 
      });
      this.showDeleteConfirm = false;
      this.selectedUser = null;
      this.deleteReason = '';
      await this.loadUsers();
    } catch (err) {
      alert('Failed to delete user');
      console.error(err);
    }
  }

  getProfileImage(user: AdminUser): string {
    return user.profile_image_url || 'assets/default-avatar.svg';
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getUserStatusBadge(user: AdminUser): string {
    if (user.is_blocked) return 'blocked';
    if (user.is_moderator) return 'moderator';
    if (user.is_storyteller) return 'storyteller';
    return 'user';
  }
}
