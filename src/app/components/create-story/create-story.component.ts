import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StoryService } from '../../services/story.service';
import { LocalityService } from '../../services/locality.service';
import { AuthService } from '../../services/auth.service';
import { Locality, Genre, Tag } from '../../models/story.model';

@Component({
  selector: 'app-create-story',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './create-story.component.html',
  styleUrls: ['./create-story.component.scss']
})
export class CreateStoryComponent implements OnInit {
  @ViewChild('audioPlayer') audioPlayer?: ElementRef<HTMLAudioElement>;
  @ViewChild('richTextEditor') richTextEditor?: ElementRef<HTMLDivElement>;
  
  storyForm!: FormGroup;
  audioStoryForm!: FormGroup;
  localities: Locality[] = [];
  genres: Genre[] = [];
  availableTags: Tag[] = [];
  selectedTags: Tag[] = [];
  selectedFiles: File[] = [];
  filePreviews: { url: string; type: string; name: string }[] = [];
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  editorContent = '';
  userName: string = '';
  wordCount = 0;
  maxWords = 2000;

  // Cover image
  coverImage: File | null = null;
  coverImagePreview: string = '';

  // Story inline images (max 5, max 2MB each)
  storyImages: { file: File; preview: string; caption: string }[] = [];
  maxStoryImages = 5;
  maxImageSize = 2 * 1024 * 1024; // 2MB

  // Language options
  languages = [
    { code: 'en', name: 'English' },
    { code: 'hi', name: 'Hindi' },
    { code: 'bn', name: 'Bengali' },
    { code: 'te', name: 'Telugu' },
    { code: 'mr', name: 'Marathi' },
    { code: 'ta', name: 'Tamil' },
    { code: 'gu', name: 'Gujarati' },
    { code: 'kn', name: 'Kannada' },
    { code: 'ml', name: 'Malayalam' },
    { code: 'pa', name: 'Punjabi' },
    { code: 'other', name: 'Other' }
  ];

  // Tag input
  tagInput: string = '';

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
      description: ['', [Validators.required, Validators.minLength(20), Validators.maxLength(500)]],
      locality_id: ['', Validators.required],
      genre: ['', Validators.required],
      language: ['en', Validators.required],
      main_characters: this.fb.array([])
    });

    this.audioStoryForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(5)]],
      description: ['', [Validators.required, Validators.minLength(20), Validators.maxLength(500)]],
      locality_id: ['', Validators.required],
      genre: ['', Validators.required],
      language: ['en', Validators.required],
      audio_url: ['', Validators.required],
      main_characters: this.fb.array([])
    });

    await this.loadLocalities();
    await this.loadGenres();
    await this.loadTags();
  }

  async loadLocalities() {
    try {
      this.localities = await this.localityService.getLocalities();
    } catch (error: any) {
      this.errorMessage = 'Failed to load localities';
    }
  }

  async loadGenres() {
    try {
      this.genres = await this.storyService.getGenres();
    } catch (error: any) {
      this.errorMessage = 'Failed to load genres';
    }
  }

  async loadTags() {
    try {
      this.availableTags = await this.storyService.getTags();
    } catch (error: any) {
      this.errorMessage = 'Failed to load tags';
    }
  }

  // Main characters management
  get mainCharacters(): FormArray {
    const form = this.storyType === 'text' ? this.storyForm : this.audioStoryForm;
    return form.get('main_characters') as FormArray;
  }

  addCharacter() {
    if (this.mainCharacters.length < 10) {
      this.mainCharacters.push(this.fb.control('', Validators.required));
    }
  }

  removeCharacter(index: number) {
    this.mainCharacters.removeAt(index);
  }

  // Cover image management
  onCoverImageSelect(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        this.errorMessage = 'Please select a valid image file';
        return;
      }
      if (file.size > this.maxImageSize) {
        this.errorMessage = 'Cover image must be less than 2MB';
        return;
      }
      
      this.coverImage = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.coverImagePreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  removeCoverImage() {
    this.coverImage = null;
    this.coverImagePreview = '';
  }

  // Story inline images management
  onStoryImageSelect(event: any) {
    const files: FileList = event.target.files;
    
    for (let i = 0; i < files.length && this.storyImages.length < this.maxStoryImages; i++) {
      const file = files[i];
      
      if (!file.type.startsWith('image/')) {
        this.errorMessage = 'Please select valid image files only';
        continue;
      }
      
      if (file.size > this.maxImageSize) {
        this.errorMessage = `Image ${file.name} is too large (max 2MB)`;
        continue;
      }
      
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.storyImages.push({
          file: file,
          preview: e.target.result,
          caption: ''
        });
      };
      reader.readAsDataURL(file);
    }
    
    if (this.storyImages.length >= this.maxStoryImages) {
      this.errorMessage = `Maximum ${this.maxStoryImages} images allowed`;
    }
  }

  insertImageAtCursor(imageIndex: number) {
    const img = this.storyImages[imageIndex];
    const imgTag = `<div class="story-inline-image" data-image-index="${imageIndex}"><img src="${img.preview}" alt="${img.caption || 'Story image'}"/>${img.caption ? `<p class="image-caption">${img.caption}</p>` : ''}</div>`;
    
    if (this.richTextEditor) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const fragment = range.createContextualFragment(imgTag);
        range.insertNode(fragment);
        
        // Update form content
        this.editorContent = this.richTextEditor.nativeElement.innerHTML;
        this.storyForm.patchValue({ content: this.richTextEditor.nativeElement.innerText || '' });
      }
    }
  }

  removeStoryImage(index: number) {
    this.storyImages.splice(index, 1);
  }

  // Tags management
  addTag() {
    const tagName = this.tagInput.trim().toLowerCase();
    if (!tagName) return;
    
    // Check if tag already selected
    if (this.selectedTags.some(t => t.name.toLowerCase() === tagName)) {
      this.tagInput = '';
      return;
    }
    
    // Find existing tag or create new
    let tag = this.availableTags.find(t => t.name.toLowerCase() === tagName);
    if (!tag) {
      tag = { name: tagName };
    }
    
    this.selectedTags.push(tag);
    this.tagInput = '';
  }

  selectTag(tag: Tag) {
    if (!this.selectedTags.some(t => t.name === tag.name)) {
      this.selectedTags.push(tag);
    }
  }

  removeTag(index: number) {
    this.selectedTags.splice(index, 1);
  }

  filterTags(): Tag[] {
    if (!this.tagInput) return this.availableTags.slice(0, 10);
    const input = this.tagInput.toLowerCase();
    return this.availableTags
      .filter(t => t.name.toLowerCase().includes(input) && !this.selectedTags.some(st => st.name === t.name))
      .slice(0, 10);
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
    const text = target.innerText || '';
    
    // Count words
    this.wordCount = this.countWords(text);
    
    // Check word limit
    if (this.wordCount > this.maxWords) {
      // Prevent further input by reverting to previous content
      target.innerHTML = this.editorContent;
      // Place cursor at end
      const range = document.createRange();
      const selection = window.getSelection();
      range.selectNodeContents(target);
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);
      return;
    }
    
    this.editorContent = target.innerHTML;
    
    // If there are inline images, save HTML content; otherwise save plain text
    if (this.storyImages.length > 0) {
      this.storyForm.patchValue({ content: this.editorContent });
    } else {
      this.storyForm.patchValue({ content: text });
    }
  }
  
  countWords(text: string): number {
    // Remove extra whitespace and count words
    const trimmed = text.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).length;
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
          const storyData = {
            ...this.storyForm.value,
            // Use HTML content if inline images exist, otherwise use plain text
            content: this.storyImages.length > 0 ? this.editorContent : this.storyForm.value.content,
            main_characters: this.mainCharacters.value.filter((c: string) => c.trim())
          };
          
          await this.storyService.createEnhancedStory(
            storyData,
            this.selectedFiles,
            this.coverImage,
            this.storyImages,
            this.selectedTags
          );
          this.successMessage = 'Story submitted for review!';
        } else if (this.storyType === 'audio') {
          const audioFileToUpload = this.audioFile || (this.recordedBlob ? new File([this.recordedBlob], this.audioFileName, { type: this.recordedBlob.type }) : null);
          
          if (audioFileToUpload) {
            const storyData = {
              ...this.audioStoryForm.value,
              main_characters: this.mainCharacters.value.filter((c: string) => c.trim())
            };
            
            await this.storyService.createEnhancedAudioStory(
              storyData,
              audioFileToUpload,
              this.audioDuration,
              this.coverImage,
              this.selectedTags
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
