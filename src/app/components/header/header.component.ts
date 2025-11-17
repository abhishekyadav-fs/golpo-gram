import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-header',
  imports: [CommonModule, RouterLink],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  constructor(
    private router: Router,
    public authService: AuthService
  ) {}

  navigateToFeed(): void {
    this.router.navigate(['/feed']);
  }

  navigateToCreate(): void {
    this.router.navigate(['/create-story']);
  }

  logout(): void {
    this.authService.signOut();
    this.router.navigate(['/login']);
  }
}
