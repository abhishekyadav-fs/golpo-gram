import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { SignupComponent } from './components/signup/signup.component';
import { FeedComponent } from './components/feed/feed.component';
import { CreateStoryComponent } from './components/create-story/create-story.component';
import { ModerationComponent } from './components/moderation/moderation.component';
import { MyStoriesComponent } from './components/my-stories/my-stories.component';
import { ProfileComponent } from './components/profile/profile.component';
import { StoryDetailComponent } from './components/story-detail/story-detail.component';
import { authGuard, noAuthGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/feed', pathMatch: 'full' },
  { path: 'login', component: LoginComponent, canActivate: [noAuthGuard] },
  { path: 'signup', component: SignupComponent, canActivate: [noAuthGuard] },
  { path: 'feed', component: FeedComponent },
  { path: 'story/:id', component: StoryDetailComponent },
  { path: 'create-story', component: CreateStoryComponent, canActivate: [authGuard] },
  { path: 'moderation', component: ModerationComponent, canActivate: [authGuard] },
  { path: 'my-stories', component: MyStoriesComponent, canActivate: [authGuard] },
  { path: 'profile', component: ProfileComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: '/feed' }
];
