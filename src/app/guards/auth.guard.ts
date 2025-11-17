import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const isAuthenticated = await authService.waitForAuthReady();

  if (isAuthenticated) {
    return true;
  } else {
    router.navigate(['/login']);
    return false;
  }
};

export const noAuthGuard: CanActivateFn = async (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const isAuthenticated = await authService.waitForAuthReady();
  console.log('noAuthGuard - isAuthenticated:', isAuthenticated, 'path:', state.url);

  if (!isAuthenticated) {
    return true;
  } else {
    console.log('User already authenticated, redirecting to feed');
    router.navigate(['/feed']);
    return false;
  }
};
