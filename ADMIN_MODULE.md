# Bird Eye - Admin Module

## Overview
Bird Eye is the comprehensive admin dashboard for Golpogram, providing complete control over users, storytellers, and moderators.

## Features

### 1. User Management (`/admin/users`)
- **View All Users**: Complete list of all registered users with details
- **Search Users**: Search by name or email
- **User Details**: 
  - Profile information
  - Account status (User, Storyteller, Moderator, Blocked)
  - Join date
  - Story count (for storytellers)
- **Actions**:
  - Block/Unblock users
  - Delete users (with reason tracking)
  - View user profile

### 2. Storyteller Management (`/admin/storytellers`)
- **View All Storytellers**: Grid view of all storytellers
- **Search**: Find storytellers by name or email
- **Storyteller Details**:
  - Profile photo and bio
  - Total stories count
  - Story statistics (Approved, Pending, Rejected)
  - Member since date
- **Actions**:
  - Block/Unblock storytellers
  - Delete storytellers (deletes all their stories)
  - View storyteller profile page

### 3. Moderator Management (`/admin/moderators`)
- **View All Moderators**: List of active moderators
- **Moderator Stats**:
  - Total stories reviewed
  - Stories approved
  - Stories rejected
  - Last activity date
- **Actions**:
  - Add new moderators (search and assign)
  - Remove moderators
  - View detailed activity history
- **Activity Tracking**:
  - All moderation actions
  - Story details
  - Approval/rejection timestamps

## Database Schema

### New Columns in `profiles` Table
```sql
is_admin BOOLEAN DEFAULT FALSE
is_moderator BOOLEAN DEFAULT FALSE
is_blocked BOOLEAN DEFAULT FALSE
last_login TIMESTAMPTZ
```

### New `admin_logs` Table
Tracks all admin actions for audit purposes:
```sql
id UUID PRIMARY KEY
admin_id UUID (references profiles)
action TEXT (block_user, delete_user, add_moderator, etc.)
target_user_id UUID (references profiles)
reason TEXT
created_at TIMESTAMPTZ
```

### Updated `stories` Table
```sql
reviewed_by UUID (references profiles)
reviewed_at TIMESTAMPTZ
```

## Setup Instructions

### 1. Database Migration
Run the SQL migration in Supabase SQL Editor:
```bash
database/migrations/add-admin-module.sql
```

### 2. Create First Admin
After running the migration, manually assign admin role to your account:
```sql
UPDATE profiles 
SET is_admin = true 
WHERE email = 'your-admin-email@example.com';
```

### 3. Access Bird Eye
- Admin users will see a "Bird Eye" icon (visibility) in the header
- Navigate to `/admin` to access the dashboard
- Three main sections: Users, Storytellers, Moderators

## Security Features

### Row Level Security (RLS)
- **Admin Access**: Only users with `is_admin = true` can:
  - View all user profiles
  - Update any profile
  - Delete users
  - View admin logs
  - Access admin endpoints

### Moderator Permissions
- View all stories (approved, pending, rejected)
- Update story status (approve/reject)
- Automatically tracked in `reviewed_by` and `reviewed_at` fields

### Action Logging
All admin actions are logged in `admin_logs` table:
- Who performed the action
- What action was performed
- Target user
- Reason (optional)
- Timestamp

## UI Components

### Admin Layout
```
/admin
  ├── /users (User Management)
  ├── /storytellers (Storyteller Management)
  └── /moderators (Moderator Management)
```

### Design System
- Consistent with Golpogram branding
- Material Symbols Outlined icons
- Responsive grid layouts
- Modal dialogs for confirmations
- Search functionality across all sections

### Color Coding
- **Users**: Default gray
- **Storytellers**: Primary yellow/gold
- **Moderators**: Blue
- **Blocked**: Red
- **Actions**: Icon-based with hover states

## API Service Methods

### AdminService (`admin.service.ts`)

#### User Management
- `getAllUsers()`: Fetch all users
- `getUserById(userId)`: Get specific user
- `blockUser(request)`: Block a user
- `unblockUser(userId)`: Unblock a user
- `deleteUser(request)`: Delete user and their data
- `searchUsers(term)`: Search users

#### Storyteller Management
- `getAllStorytellers()`: Fetch all storytellers with stats
- `getStorytellerById(id)`: Get specific storyteller
- `blockStoryteller(id, reason)`: Block storyteller
- `deleteStoryteller(id, reason)`: Delete storyteller

#### Moderator Management
- `getAllModerators()`: Fetch all moderators with stats
- `getModeratorActivity(id)`: Get moderation history
- `addModerator(request)`: Promote user to moderator
- `removeModerator(userId)`: Remove moderator role

#### Utilities
- `isAdmin()`: Check if current user is admin
- `logAdminAction()`: Log admin actions

## Usage Examples

### Block a User
```typescript
await adminService.blockUser({ 
  user_id: '123-456-789', 
  reason: 'Violated community guidelines' 
});
```

### Add Moderator
```typescript
await adminService.addModerator({ 
  user_id: '123-456-789' 
});
```

### View Moderator Activity
```typescript
const activity = await adminService.getModeratorActivity('moderator-id');
// Returns array of moderation actions
```

## Best Practices

### 1. Admin Assignment
- Only assign admin role to trusted individuals
- Keep admin accounts secure with strong passwords
- Consider enabling 2FA for admin accounts

### 2. User Deletion
- Always provide a reason when deleting users
- Warn users before deletion (if policy allows)
- Review deletion logs regularly

### 3. Moderator Management
- Monitor moderator activity regularly
- Remove inactive moderators
- Provide clear moderation guidelines

### 4. Action Logging
- Review admin logs periodically
- Investigate suspicious activities
- Keep logs for compliance/audit purposes

## Mobile Responsiveness

All admin components are fully responsive:
- **Desktop**: Full table/grid layouts with all details
- **Tablet**: Adjusted columns and spacing
- **Mobile**: Stacked cards, simplified views

## Future Enhancements

Potential additions:
- Dashboard with statistics and charts
- Email notifications for admin actions
- Bulk user operations
- Advanced filtering and sorting
- Export user/storyteller data
- IP-based access restrictions
- Admin role levels (super admin, admin, moderator)
- Automated moderation rules
- User reports and flagging system

## Support

For issues or questions about the admin module:
1. Check database migration completion
2. Verify admin role assignment
3. Check browser console for errors
4. Review RLS policies in Supabase

## Changelog

### Version 1.0.0
- Initial release
- User management
- Storyteller management
- Moderator management
- Action logging
- Activity tracking
