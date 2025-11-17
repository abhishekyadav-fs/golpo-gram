import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StoryService } from '../../services/story.service';
import { LocalityService } from '../../services/locality.service';
import { AuthService } from '../../services/auth.service';
import { Locality } from '../../models/story.model';

@Component({
  selector: 'app-create-story',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-story.component.html',
  styleUrls: ['./create-story.component.scss']
})
export class CreateStoryComponent implements OnInit {
  storyForm!: FormGroup;
  localities: Locality[] = [];
  selectedFiles: File[] = [];
  filePreviews: { url: string; type: string; name: string }[] = [];
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private fb: FormBuilder,
    private storyService: StoryService,
    private localityService: LocalityService,
    private authService: AuthService,
    private router: Router
  ) {}

  async ngOnInit() {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    this.storyForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(5)]],
      content: ['', [Validators.required, Validators.minLength(20)]],
      locality_id: ['', Validators.required]
    });

    await this.loadLocalities();
  }

  async loadLocalities() {
    try {
      this.localities = await this.localityService.getLocalities();
    } catch (error: any) {
      this.errorMessage = 'Failed to load localities';
    }
  }

  onFileSelect(event: any) {
    const files: FileList = event.target.files;
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      this.selectedFiles.push(file);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const fileType = this.getFileType(file.type);
        this.filePreviews.push({
          url: e.target.result,
          type: fileType,
          name: file.name
        });
      };
      reader.readAsDataURL(file);
    }
  }

  removeFile(index: number) {
    this.selectedFiles.splice(index, 1);
    this.filePreviews.splice(index, 1);
  }

  private getFileType(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'file';
  }

  async onSubmit() {
    if (this.storyForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';

      try {
        await this.storyService.createStory(this.storyForm.value, this.selectedFiles);
        this.successMessage = 'Story submitted for review!';
        setTimeout(() => {
          this.router.navigate(['/my-stories']);
        }, 2000);
      } catch (error: any) {
        this.errorMessage = error.message || 'Failed to create story';
      } finally {
        this.isLoading = false;
      }
    }
  }
}
