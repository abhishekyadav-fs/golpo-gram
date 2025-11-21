import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterLink, NavigationEnd } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { StoryService } from '../../services/story.service';
import { AdminService } from '../../services/admin.service';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-header',
  imports: [CommonModule, RouterLink],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent implements OnInit, OnDestroy {
  hasStories = false;
  isAdmin = false;
  private authSubscription?: Subscription;

  constructor(
    private router: Router,
    public authService: AuthService,
    private storyService: StoryService,
    private adminService: AdminService
  ) {
    // Check for stories when navigation ends (after creating a story)
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      if (this.authService.isAuthenticated()) {
        this.checkUserStories();
        this.checkAdminStatus();
      }
    });
  }

  async ngOnInit() {
    // Subscribe to auth state changes
    this.authSubscription = this.authService.currentUser$.subscribe(async (user) => {
      if (user) {
        // User logged in - check stories and admin status
        await this.checkUserStories();
        await this.checkAdminStatus();
      } else {
        // User logged out - reset flags
        this.hasStories = false;
        this.isAdmin = false;
      }
    });

    // Initial check if already authenticated
    if (this.authService.isAuthenticated()) {
      await this.checkUserStories();
      await this.checkAdminStatus();
    }
  }

  ngOnDestroy() {
    // Clean up subscription
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  async checkUserStories() {
    try {
      const stories = await this.storyService.getMyStories();
      this.hasStories = stories.length > 0;
    } catch (error) {
      console.error('Error checking user stories:', error);
      this.hasStories = false;
    }
  }

  async checkAdminStatus() {
    try {
      this.isAdmin = await this.adminService.isAdmin();
    } catch (error) {
      console.error('Error checking admin status:', error);
      this.isAdmin = false;
    }
  }

  navigateToFeed(): void {
    this.router.navigate(['/feed']);
  }

  navigateToCreate(): void {
    this.router.navigate(['/create-story']);
  }

  logout(): void {
    this.authService.signOut();
    // Reset flags immediately on logout
    this.hasStories = false;
    this.isAdmin = false;
    this.router.navigate(['/login']);
  }
}
