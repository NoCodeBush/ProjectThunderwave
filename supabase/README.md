# Supabase Database Migrations

This directory contains SQL migration files for setting up the database schema in Supabase.

## Running Migrations


If you have the Supabase CLI installed:

```bash
# Link to your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

## Migration Files

### 001_create_jobs_table.sql
Creates the `jobs` table with the following structure:
- `id` (UUID, primary key)
- `name` (TEXT, required)
- `client` (TEXT, required)
- `date` (DATE, required)
- `location` (TEXT, required)
- `tags` (TEXT[], array of strings)
- `details` (TEXT, required)
- `user_id` (UUID, foreign key to auth.users)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

Includes Row Level Security (RLS) policies to ensure users can only access their own jobs.

### 002_create_test_equipment_table.sql
Creates the `test_equipment` table with the following structure:
- `id` (UUID, primary key)
- `name` (TEXT, required)
- `serial_number` (TEXT, required)
- `date_test` (DATE, required)
- `expiry` (DATE, required)
- `user_id` (UUID, foreign key to auth.users)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

Includes Row Level Security (RLS) policies to ensure users can only access their own test equipment.

### 003_create_job_assignments_table.sql
Creates the `job_assignments` table for many-to-many relationships between jobs and users:
- `id` (UUID, primary key)
- `job_id` (UUID, foreign key to jobs)
- `user_id` (UUID, foreign key to auth.users)
- `assigned_at` (TIMESTAMP)

Allows job owners to assign jobs to multiple users. Includes RLS policies to ensure:
- Users can view assignments for jobs they own or are assigned to
- Only job owners can create/delete assignments

### 004_create_user_profiles_view.sql
Creates a function and view to expose user information for job assignment:
- `id` (UUID)
- `email` (TEXT)
- `display_name` (TEXT)
- `avatar_url` (TEXT)

Uses a SECURITY DEFINER function to safely access auth.users table. Authenticated users can query this view to see other users for assignment purposes.

## Row Level Security (RLS)

Both tables have RLS enabled with policies that:
- Allow users to SELECT only their own records
- Allow users to INSERT only records with their own user_id
- Allow users to UPDATE only their own records
- Allow users to DELETE only their own records

This ensures data isolation between users.

