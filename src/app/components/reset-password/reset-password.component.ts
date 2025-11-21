import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss']
})
export class ResetPasswordComponent implements OnInit {
  resetPasswordForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  hasValidToken = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.resetPasswordForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  async ngOnInit(): Promise<void> {
    // Wait a moment for Supabase to process the hash fragment
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Check if we have access token or error in the URL hash
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const error = hashParams.get('error');
    const errorDescription = hashParams.get('error_description');
    
    if (error) {
      this.errorMessage = errorDescription || 'Invalid or expired reset link. Please request a new one.';
      this.hasValidToken = false;
    } else if (accessToken) {
      this.hasValidToken = true;
    } else {
      // Check if user has an active session (recovery session)
      const { data } = await this.authService.getSupabaseClient().auth.getSession();
      if (data.session) {
        this.hasValidToken = true;
      } else {
        this.errorMessage = 'Invalid or expired reset link. Please request a new one.';
        this.hasValidToken = false;
      }
    }
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');
    
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    return null;
  }

  async onSubmit() {
    if (this.resetPasswordForm.invalid || !this.hasValidToken) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const newPassword = this.resetPasswordForm.value.password;

    try {
      await this.authService.updatePassword(newPassword);
      this.successMessage = 'Password updated successfully! Redirecting to login...';
      
      // Sign out the user after password reset
      await this.authService.signOut();
      
      // Redirect to login page
      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 1500);
    } catch (error: any) {
      this.errorMessage = error.message || 'Failed to update password. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }
}
