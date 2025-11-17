import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { StoryService } from '../../services/story.service';
import { LocalityService } from '../../services/locality.service';
import { AuthService } from '../../services/auth.service';
import { Locality } from '../../models/story.model';

@Component({
  selector: 'app-create-story',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './create-story.component.html',
  styleUrls: ['./create-story.component.scss']
})
export class CreateStoryComponent implements OnInit {
  @ViewChild('audioPlayer') audioPlayer?: ElementRef<HTMLAudioElement>;
  
  storyForm!: FormGroup;
  audioStoryForm!: FormGroup;
  localities: Locality[] = [];
  selectedFiles: File[] = [];
  filePreviews: { url: string; type: string; name: string }[] = [];
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  editorContent = '';
  userName: string = '';

  // Story type selection
  storyType: 'text' | 'audio' | null = null;

  // Audio story properties
  audioFile: File | null = null;
  audioPreviewUrl: string = '';
  audioFileName: string = '';
  audioDuration: number = 0;
  showUpload: boolean = false;

  // Audio recording properties
  isRecording: boolean = false;
  mediaRecorder: MediaRecorder | null = null;
  audioChunks: Blob[] = [];
  recordedBlob: Blob | null = null;
  recordingDuration: string = '00:00';
  recordingStartTime: number = 0;
  recordingInterval: any = null;
  visualizerBars: number[] = Array(20).fill(30);
  animationFrame: any = null;

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

    // Get current user name
    const user = this.authService.getCurrentUser();
    this.userName = user?.full_name || 'User';

    this.storyForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(5)]],
      content: ['', [Validators.required, Validators.minLength(20)]],
      locality_id: ['', Validators.required]
    });

    this.audioStoryForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(5)]],
      locality_id: ['', Validators.required],
      audio_url: ['', Validators.required]
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

  selectStoryType(type: 'text' | 'audio') {
    this.storyType = type;
  }

  goBack() {
    if (this.storyType) {
      this.storyType = null;
      this.resetForms();
    } else {
      this.router.navigate(['/my-stories']);
    }
  }

  resetForms() {
    this.storyForm.reset();
    this.audioStoryForm.reset();
    this.selectedFiles = [];
    this.filePreviews = [];
    this.removeAudio();
    this.errorMessage = '';
    this.successMessage = '';
  }

  // Audio file upload
  showUploadAudio() {
    this.showUpload = true;
  }

  onAudioFileSelect(event: any) {
    const file: File = event.target.files[0];
    if (file && file.type.startsWith('audio/')) {
      this.audioFile = file;
      this.audioFileName = file.name;
      this.audioPreviewUrl = URL.createObjectURL(file);
      
      // Get audio duration
      const audio = new Audio();
      audio.src = this.audioPreviewUrl;
      audio.onloadedmetadata = () => {
        this.audioDuration = Math.floor(audio.duration);
      };

      this.audioStoryForm.patchValue({ audio_url: 'pending' });
      this.showUpload = false;
    } else {
      this.errorMessage = 'Please select a valid audio file';
    }
  }

  // Audio recording
  async startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        this.audioChunks.push(event.data);
      };

      this.mediaRecorder.onstop = () => {
        this.recordedBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        this.audioPreviewUrl = URL.createObjectURL(this.recordedBlob);
        this.audioFileName = `recorded-${Date.now()}.webm`;
        
        // Get duration
        const audio = new Audio();
        audio.src = this.audioPreviewUrl;
        audio.onloadedmetadata = () => {
          this.audioDuration = Math.floor(audio.duration);
        };

        this.audioStoryForm.patchValue({ audio_url: 'pending' });
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      this.mediaRecorder.start();
      this.isRecording = true;
      this.recordingStartTime = Date.now();
      this.startRecordingTimer();
      this.startVisualizer();
    } catch (error: any) {
      this.errorMessage = 'Could not access microphone. Please grant permission.';
      console.error('Error accessing microphone:', error);
    }
  }

  stopRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
      this.stopRecordingTimer();
      this.stopVisualizer();
    }
  }

  startRecordingTimer() {
    this.recordingInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.recordingStartTime) / 1000);
      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;
      this.recordingDuration = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);
  }

  stopRecordingTimer() {
    if (this.recordingInterval) {
      clearInterval(this.recordingInterval);
      this.recordingDuration = '00:00';
    }
  }

  startVisualizer() {
    const animate = () => {
      this.visualizerBars = this.visualizerBars.map(() => 
        Math.random() * 70 + 30
      );
      this.animationFrame = requestAnimationFrame(animate);
    };
    animate();
  }

  stopVisualizer() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.visualizerBars = Array(20).fill(30);
    }
  }

  removeAudio() {
    this.audioFile = null;
    this.recordedBlob = null;
    this.audioPreviewUrl = '';
    this.audioFileName = '';
    this.audioDuration = 0;
    this.showUpload = false;
    this.audioStoryForm.patchValue({ audio_url: '' });
  }

  formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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

  execCommand(command: string, value: string | null = null) {
    document.execCommand(command, false, value || undefined);
  }

  onEditorInput(event: Event) {
    const target = event.target as HTMLElement;
    this.editorContent = target.innerHTML;
    this.storyForm.patchValue({ content: target.innerText || '' });
  }

  private getFileType(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'file';
  }

  async onSubmit() {
    const form = this.storyType === 'text' ? this.storyForm : this.audioStoryForm;
    
    if (form.valid) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';

      try {
        if (this.storyType === 'text') {
          await this.storyService.createStory(this.storyForm.value, this.selectedFiles);
          this.successMessage = 'Story submitted for review!';
        } else if (this.storyType === 'audio') {
          const audioFileToUpload = this.audioFile || (this.recordedBlob ? new File([this.recordedBlob], this.audioFileName, { type: this.recordedBlob.type }) : null);
          
          if (audioFileToUpload) {
            await this.storyService.createAudioStory(
              this.audioStoryForm.value.title,
              this.audioStoryForm.value.locality_id,
              audioFileToUpload,
              this.audioDuration
            );
            this.successMessage = 'Audio story submitted for review!';
          }
        }
        
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

  ngOnDestroy() {
    // Clean up
    if (this.isRecording) {
      this.stopRecording();
    }
    if (this.audioPreviewUrl) {
      URL.revokeObjectURL(this.audioPreviewUrl);
    }
  }
}
