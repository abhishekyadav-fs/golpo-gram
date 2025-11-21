# Event Bus Implementation

## Overview
The Event Bus service provides a centralized event management system for publishing and subscribing to events across unrelated components in the Golpo Gram application.

## Architecture

### EventBusService
Located at: `src/app/services/event-bus.service.ts`

The service uses RxJS `Subject` to implement a publish-subscribe pattern that allows components to communicate without direct dependencies.

## Event Types

```typescript
export enum EventType {
  STORY_CREATED = 'STORY_CREATED',
  STORY_APPROVED = 'STORY_APPROVED',
  STORY_REJECTED = 'STORY_REJECTED',
  STORY_DELETED = 'STORY_DELETED',
  USER_BLOCKED = 'USER_BLOCKED',
  USER_UNBLOCKED = 'USER_UNBLOCKED',
  STORYTELLER_BLOCKED = 'STORYTELLER_BLOCKED',
  STORYTELLER_UNBLOCKED = 'STORYTELLER_UNBLOCKED',
  MODERATOR_ADDED = 'MODERATOR_ADDED',
  MODERATOR_REMOVED = 'MODERATOR_REMOVED',
  PROFILE_UPDATED = 'PROFILE_UPDATED'
}
```

## Usage

### Publishing Events

#### From Services

**Story Service** - Publishes events when stories are created or moderated:
```typescript
// Story created
this.eventBus.publish({
  type: EventType.STORY_CREATED,
  payload: { story: storyData, authorId: user.id }
});

// Story approved/rejected
this.eventBus.publish({
  type: EventType.STORY_APPROVED, // or STORY_REJECTED
  payload: { 
    story: updatedStory, 
    storyId, 
    status, 
    moderatorId: user.id,
    notes 
  }
});
```

**Admin Service** - Publishes events for admin actions:
```typescript
// User blocked
this.eventBus.publish({
  type: EventType.USER_BLOCKED,
  payload: { userId: request.user_id, reason: request.reason }
});

// Story deleted
this.eventBus.publish({
  type: EventType.STORY_DELETED,
  payload: { storyId, authorId: story?.author_id }
});
```

### Subscribing to Events

#### In Components

**Subscribe to specific event type:**
```typescript
import { EventBusService, EventType } from '../../services/event-bus.service';
import { Subscription } from 'rxjs';

export class MyComponent implements OnInit, OnDestroy {
  private eventSubscriptions: Subscription[] = [];

  constructor(private eventBus: EventBusService) {}

  ngOnInit() {
    const sub = this.eventBus.on(EventType.STORY_APPROVED).subscribe((payload) => {
      console.log('Story approved:', payload);
      // Handle the event
    });
    
    this.eventSubscriptions.push(sub);
  }

  ngOnDestroy() {
    this.eventSubscriptions.forEach(sub => sub.unsubscribe());
  }
}
```

**Subscribe to multiple event types:**
```typescript
const multiSub = this.eventBus.onMultiple([
  EventType.STORY_APPROVED,
  EventType.STORY_REJECTED
]).subscribe((payload) => {
  console.log('Story moderated:', payload);
});
```

**Subscribe to all events:**
```typescript
const allSub = this.eventBus.onAll().subscribe((event) => {
  console.log('Event:', event.type, event.payload);
});
```

## Real-World Implementation

### Admin Bird Eye View - Live Updates

The Admin Storytellers component subscribes to story-related events to automatically update storyteller statistics in real-time:

```typescript
export class AdminStorytellersComponent implements OnInit, OnDestroy {
  private eventSubscriptions: Subscription[] = [];

  ngOnInit() {
    this.subscribeToEvents();
  }

  private subscribeToEvents() {
    // Listen for story approved/rejected events
    const storyApprovedSub = this.eventBus.on(EventType.STORY_APPROVED).subscribe((payload) => {
      this.handleStoryModerated(payload);
    });

    const storyRejectedSub = this.eventBus.on(EventType.STORY_REJECTED).subscribe((payload) => {
      this.handleStoryModerated(payload);
    });

    this.eventSubscriptions.push(storyApprovedSub, storyRejectedSub);
  }

  private handleStoryModerated(payload: any) {
    // Find the storyteller whose story was moderated
    const storyteller = this.storytellers.find(st => st.id === payload.story?.author_id);
    if (storyteller) {
      // Refresh only this storyteller's data
      this.adminService.getStorytellerById(storyteller.id).then(updated => {
        if (updated) {
          const index = this.storytellers.findIndex(st => st.id === storyteller.id);
          if (index !== -1) {
            this.storytellers[index] = updated;
            this.onSearch(); // Refresh filtered list
          }
        }
      });
    }
  }
}
```

**Result:** When a moderator approves or rejects a story, the admin's Bird Eye view automatically updates the storyteller's stats (approved/pending/rejected counts) without requiring a page refresh.

## Benefits

1. **Loose Coupling**: Components don't need direct references to each other
2. **Real-Time Updates**: Changes propagate automatically across the application
3. **Centralized Event Management**: All events are managed in one place
4. **Type Safety**: TypeScript enums ensure event type consistency
5. **Easy Testing**: Components can be tested independently
6. **Scalability**: Easy to add new events and subscribers

## Best Practices

1. **Always unsubscribe**: Implement `OnDestroy` and clean up subscriptions to prevent memory leaks
2. **Use enums**: Use `EventType` enum for type safety instead of string literals
3. **Meaningful payloads**: Include all relevant data in event payloads
4. **Error handling**: Wrap event handlers in try-catch blocks
5. **Avoid excessive events**: Only publish events for significant state changes
6. **Document events**: Document what each event type means and when it's published

## Adding New Events

1. Add event type to `EventType` enum in `event-bus.service.ts`
2. Publish the event from the appropriate service
3. Subscribe to the event in components that need to react
4. Update this documentation

## Example: Adding a New Event

```typescript
// 1. Add to EventType enum
export enum EventType {
  // ...existing events
  COMMENT_ADDED = 'COMMENT_ADDED'
}

// 2. Publish from service
class CommentService {
  async addComment(comment: Comment) {
    // ... save comment
    this.eventBus.publish({
      type: EventType.COMMENT_ADDED,
      payload: { comment, storyId: comment.story_id }
    });
  }
}

// 3. Subscribe in component
class StoryDetailComponent {
  ngOnInit() {
    const sub = this.eventBus.on(EventType.COMMENT_ADDED).subscribe((payload) => {
      if (payload.storyId === this.currentStory.id) {
        this.loadComments(); // Refresh comments
      }
    });
    this.eventSubscriptions.push(sub);
  }
}
```

## Events Currently Implemented

| Event | Publisher | Subscribers | Payload |
|-------|-----------|-------------|---------|
| STORY_CREATED | StoryService | AdminStorytellersComponent | `{ story, authorId }` |
| STORY_APPROVED | StoryService | AdminStorytellersComponent | `{ story, storyId, status, moderatorId, notes }` |
| STORY_REJECTED | StoryService | AdminStorytellersComponent | `{ story, storyId, status, moderatorId, notes }` |
| STORY_DELETED | AdminService | AdminStorytellersComponent | `{ storyId, authorId }` |
| USER_BLOCKED | AdminService | - | `{ userId, reason }` |
| USER_UNBLOCKED | AdminService | - | `{ userId }` |
| STORYTELLER_BLOCKED | AdminService | - | `{ storytellerId, reason }` |
