import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { SignupComponent } from './components/signup/signup.component';
import { FeedComponent } from './components/feed/feed.component';
import { CreateStoryComponent } from './components/create-story/create-story.component';
import { ModerationComponent } from './components/moderation/moderation.component';
import { MyStoriesComponent } from './components/my-stories/my-stories.component';

export const routes: Routes = [
  { path: '', redirectTo: '/feed', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'signup', component: SignupComponent },
  { path: 'feed', component: FeedComponent },
  { path: 'create-story', component: CreateStoryComponent },
  { path: 'moderation', component: ModerationComponent },
  { path: 'my-stories', component: MyStoriesComponent },
  { path: '**', redirectTo: '/feed' }
];
