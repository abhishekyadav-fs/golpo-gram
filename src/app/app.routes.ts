import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { SignupComponent } from './components/signup/signup.component';
import { FeedComponent } from './components/feed/feed.component';
import { CreateStoryComponent } from './components/create-story/create-story.component';
import { ModerationComponent } from './components/moderation/moderation.component';
import { MyStoriesComponent } from './components/my-stories/my-stories.component';
import { ProfileComponent } from './components/profile/profile.component';
import { StoryDetailComponent } from './components/story-detail/story-detail.component';
import { StorytellerProfileComponent } from './components/storyteller-profile/storyteller-profile.component';
import { TermsComponent } from './components/terms/terms.component';
import { PrivacyComponent } from './components/privacy/privacy.component';
import { ForgotPasswordComponent } from './components/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './components/reset-password/reset-password.component';
import { AdminComponent } from './components/admin/admin.component';
import { AdminUsersComponent } from './components/admin/admin-users/admin-users.component';
import { AdminStorytellersComponent } from './components/admin/admin-storytellers/admin-storytellers.component';
import { AdminModeratorsComponent } from './components/admin/admin-moderators/admin-moderators.component';
import { authGuard, noAuthGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/feed', pathMatch: 'full' },
  { path: 'login', component: LoginComponent, canActivate: [noAuthGuard] },
  { path: 'signup', component: SignupComponent, canActivate: [noAuthGuard] },
  { path: 'forgot-password', component: ForgotPasswordComponent, canActivate: [noAuthGuard] },
  { path: 'reset-password', component: ResetPasswordComponent },
  { path: 'terms', component: TermsComponent },
  { path: 'privacy', component: PrivacyComponent },
  { path: 'feed', component: FeedComponent },
  { path: 'story/:id', component: StoryDetailComponent },
  { path: 'storyteller/:id', component: StorytellerProfileComponent },
  { path: 'create-story', component: CreateStoryComponent, canActivate: [authGuard] },
  { path: 'moderation', component: ModerationComponent, canActivate: [authGuard] },
  { path: 'my-stories', component: MyStoriesComponent, canActivate: [authGuard] },
  { path: 'profile', component: ProfileComponent, canActivate: [authGuard] },
  { 
    path: 'admin', 
    component: AdminComponent, 
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'users', pathMatch: 'full' },
      { path: 'users', component: AdminUsersComponent },
      { path: 'storytellers', component: AdminStorytellersComponent },
      { path: 'moderators', component: AdminModeratorsComponent }
    ]
  },
  { path: '**', redirectTo: '/feed' }
];
