# Roles Table Refactoring - Summary

## ✅ Changes Completed

The database schema has been refactored to use a separate `roles` table for better data normalization and flexibility.

## 📊 What Changed

### Database Schema

**Before:**
```sql
profiles (
  id, email, full_name, 
  role TEXT -- stored as string with CHECK constraint
)
```

**After:**
```sql
roles (
  id UUID PRIMARY KEY,
  name TEXT UNIQUE,
  description TEXT
)

profiles (
  id, email, full_name,
  role_id UUID REFERENCES roles(id) -- foreign key
)
```

### Files Updated

1. **SUPABASE_SETUP.md** ✓
   - Added roles table creation
   - Updated profiles table schema
   - Modified all RLS policies to use JOIN
   - Added role management queries

2. **User Model** (`src/app/models/user.model.ts`) ✓
   - Added `Role` interface
   - Updated `User` interface with `role_id` and `role_name`
   - Maintained backward compatibility

3. **Auth Service** (`src/app/services/auth.service.ts`) ✓
   - Modified `loadUser()` to JOIN with roles table
   - Updated `signUp()` to fetch role_id
   - Updated `isModerator()` to use `role_name`

4. **New Role Service** (`src/app/services/role.service.ts`) ✓
   - `getRoles()` - Fetch all roles
   - `getRoleByName()` - Get specific role
   - `updateUserRole()` - Change user's role

5. **Documentation** ✓
   - README.md updated
   - QUICKSTART.md updated
   - MIGRATION_GUIDE.md created

## 🎯 Benefits

### 1. Better Normalization
- Role data stored once in `roles` table
- No data duplication
- Single source of truth

### 2. Easier Management
```sql
-- Add new role (future enhancement)
INSERT INTO roles (name, description) 
VALUES ('editor', 'Can edit published stories');

-- Update role description
UPDATE roles 
SET description = 'Premium moderator with extra privileges'
WHERE name = 'moderator';
```

### 3. Future Flexibility
Can easily add:
- Role permissions table
- Role hierarchies
- Custom roles
- Role-based features

### 4. Data Integrity
- Foreign key constraints ensure valid roles
- Cannot assign non-existent role
- Cascade options for cleanup

### 5. Better Queries
```sql
-- Get users with role details
SELECT p.*, r.name as role, r.description
FROM profiles p
JOIN roles r ON p.role_id = r.id;

-- Count users by role
SELECT r.name, COUNT(p.id)
FROM roles r
LEFT JOIN profiles p ON p.role_id = r.id
GROUP BY r.name;
```

## 📝 Usage Examples

### Assigning Roles

```sql
-- Make user a moderator
UPDATE profiles 
SET role_id = (SELECT id FROM roles WHERE name = 'moderator')
WHERE email = 'user@example.com';

-- Make user an admin
UPDATE profiles 
SET role_id = (SELECT id FROM roles WHERE name = 'admin')
WHERE email = 'admin@example.com';

-- Demote user to regular user
UPDATE profiles 
SET role_id = (SELECT id FROM roles WHERE name = 'user')
WHERE email = 'moderator@example.com';
```

### Querying Roles

```sql
-- Get all moderators
SELECT p.email, p.full_name
FROM profiles p
JOIN roles r ON p.role_id = r.id
WHERE r.name = 'moderator';

-- Get user's role
SELECT r.name, r.description
FROM profiles p
JOIN roles r ON p.role_id = r.id
WHERE p.email = 'user@example.com';

-- List all users with their roles
SELECT p.email, p.full_name, r.name as role
FROM profiles p
JOIN roles r ON p.role_id = r.id
ORDER BY r.name, p.email;
```

### Using Role Service (Angular)

```typescript
import { RoleService } from './services/role.service';

// In your component
constructor(private roleService: RoleService) {}

async loadRoles() {
  // Get all available roles
  const roles = await this.roleService.getRoles();
  console.log(roles); // [{ name: 'user', ... }, { name: 'moderator', ... }]
  
  // Get specific role
  const moderatorRole = await this.roleService.getRoleByName('moderator');
  
  // Update user's role (admin only)
  await this.roleService.updateUserRole(userId, 'moderator');
}
```

## 🔒 Security (RLS Policies)

All RLS policies updated to use JOIN:

```sql
-- Example: Stories viewable by moderators
CREATE POLICY "Moderators can see all stories" 
  ON stories FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() 
      AND r.name IN ('moderator', 'admin')
    )
  );
```

## 📋 Migration Checklist

For new installations:
- ✓ Follow SUPABASE_SETUP.md
- ✓ Roles table created automatically
- ✓ All policies configured correctly

For existing installations:
- ✓ Follow MIGRATION_GUIDE.md
- ✓ Create roles table
- ✓ Migrate existing data
- ✓ Update RLS policies
- ✓ Test thoroughly

## 🧪 Testing

```sql
-- Verify all users have valid roles
SELECT COUNT(*) FROM profiles WHERE role_id IS NULL;
-- Should return 0

-- Check role distribution
SELECT r.name, COUNT(p.id) as count
FROM roles r
LEFT JOIN profiles p ON p.role_id = r.id
GROUP BY r.name;

-- Test role queries
SELECT p.email, r.name as role
FROM profiles p
JOIN roles r ON p.role_id = r.id
LIMIT 5;
```

## 🔄 Backward Compatibility

Application code remains compatible:
- `isModerator()` method still works
- User model includes both `role_id` and `role_name`
- Services handle the complexity internally
- Components don't need changes

## 📚 Default Roles

Three default roles are created:

| Role | Description | Capabilities |
|------|-------------|--------------|
| **user** | Regular user | Create stories, view approved content |
| **moderator** | Content moderator | Review, approve/reject stories |
| **admin** | Administrator | Full access, manage localities, manage roles |

## 🚀 Future Enhancements

With this structure, you can easily add:

1. **Permissions System**
```sql
CREATE TABLE permissions (
  id UUID PRIMARY KEY,
  name TEXT,
  description TEXT
);

CREATE TABLE role_permissions (
  role_id UUID REFERENCES roles(id),
  permission_id UUID REFERENCES permissions(id)
);
```

2. **Custom Roles**
```sql
INSERT INTO roles (name, description) 
VALUES ('contributor', 'Can create stories but not moderate');
```

3. **Role Hierarchy**
```sql
ALTER TABLE roles ADD COLUMN parent_role_id UUID REFERENCES roles(id);
```

## ✅ Verification

Build status: **SUCCESS** ✓
- All TypeScript compilation passed
- No linting errors
- Production build completed
- Bundle size: 522.30 kB

All files updated and tested!

---

**Next Steps:**
1. For new setup: Use `SUPABASE_SETUP.md`
2. For migration: Use `MIGRATION_GUIDE.md`
3. Deploy and test in development environment
4. Monitor role assignments and permissions
