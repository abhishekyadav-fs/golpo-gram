import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';

export interface AppEvent {
  type: string;
  payload?: any;
}

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

@Injectable({
  providedIn: 'root'
})
export class EventBusService {
  private eventSubject = new Subject<AppEvent>();

  constructor() {}

  /**
   * Publish an event to all subscribers
   */
  publish(event: AppEvent): void {
    this.eventSubject.next(event);
  }

  /**
   * Subscribe to a specific event type
   */
  on(eventType: string): Observable<any> {
    return this.eventSubject.pipe(
      filter(event => event.type === eventType),
      map(event => event.payload)
    );
  }

  /**
   * Subscribe to all events
   */
  onAll(): Observable<AppEvent> {
    return this.eventSubject.asObservable();
  }

  /**
   * Subscribe to multiple event types
   */
  onMultiple(eventTypes: string[]): Observable<any> {
    return this.eventSubject.pipe(
      filter(event => eventTypes.includes(event.type)),
      map(event => event.payload)
    );
  }
}
