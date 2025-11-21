import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss'
})
export class AdminComponent implements OnInit {
  activeTab: string = 'users';

  constructor(
    private router: Router,
    public authService: AuthService
  ) {}

  ngOnInit() {
    // Default to users tab
    if (this.router.url === '/admin' || this.router.url === '/admin/') {
      this.router.navigate(['/admin/users']);
    }
  }

  setActiveTab(tab: string) {
    this.activeTab = tab;
    this.router.navigate([`/admin/${tab}`]);
  }

  isActiveTab(tab: string): boolean {
    return this.router.url.includes(`/admin/${tab}`);
  }
}
