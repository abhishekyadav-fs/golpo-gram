import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  profileForm!: FormGroup;
  currentUser: User | null = null;
  selectedFile: File | null = null;
  imagePreview: string | null = null;
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

  async ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();
    
    if (!this.currentUser) {
      this.router.navigate(['/login']);
      return;
    }

    this.profileForm = this.fb.group({
      email: [this.currentUser.email, [Validators.required, Validators.email]],
      full_name: [this.currentUser.full_name, [Validators.required]]
    });

    if (this.currentUser.profile_image_url) {
      this.imagePreview = this.currentUser.profile_image_url;
    }
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        this.errorMessage = 'Please select an image file';
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.errorMessage = 'Image size must be less than 5MB';
        return;
      }

      this.selectedFile = file;
      this.errorMessage = '';

      // Preview image
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  removeImage() {
    this.selectedFile = null;
    this.imagePreview = this.currentUser?.profile_image_url || null;
  }

  async onSubmit() {
    if (this.profileForm.invalid) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      const { email, full_name } = this.profileForm.value;

      // Update profile
      await this.authService.updateProfile({
        email,
        full_name,
        profile_image: this.selectedFile
      });

      this.successMessage = 'Profile updated successfully!';
      
      // Reload user data
      await this.authService.reloadUser();
      this.currentUser = this.authService.getCurrentUser();
      
      if (this.currentUser?.profile_image_url) {
        this.imagePreview = this.currentUser.profile_image_url;
      }

      this.selectedFile = null;

      // Redirect after 2 seconds
      setTimeout(() => {
        this.router.navigate(['/feed']);
      }, 2000);
    } catch (error: any) {
      this.errorMessage = error.message || 'Failed to update profile';
    } finally {
      this.isLoading = false;
    }
  }
}
