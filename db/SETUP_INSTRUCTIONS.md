# Database Setup - COMPLETE GUIDE

## Important: Email Confirmation Settings

**Before running any SQL, disable email confirmation in Supabase:**

1. Go to Supabase Dashboard → **Authentication** → **Providers**
2. Click on **Email** provider
3. **Turn OFF** "Confirm email"
4. Save changes

This allows you to test registration without needing to verify emails.

---

## Step 1: Clean Database

Run this in Supabase SQL Editor:

```sql
-- Copy the contents of db/cleanup.sql and run it
```

---

## Step 2: Create Schema

Run `db/supabase_schema.sql` in Supabase SQL Editor.

**Key improvements in this version:**
- ✅ Trigger uses `SECURITY DEFINER` to bypass RLS during profile creation
- ✅ Simplified RLS policies using EXISTS for better performance
- ✅ Public read access to profiles for easier querying
- ✅ Proper policy ordering (trigger before RLS)

---

## Step 3: Test Registration

1. Go to `/admin-register` in your app
2. Register a new admin account
3. Check Supabase Dashboard → **Authentication** → **Users** - user should exist
4. Check Supabase Dashboard → **Database** → **profiles** table - profile should exist with role='admin'

---

## Step 4: Test Login

1. Go to `/` (login page)
2. Login with the admin account you just created
3. You should see the Admin Dashboard

---

## Troubleshooting

### "403 Forbidden" on logout
This usually means the user isn't properly authenticated. Make sure:
- Email confirmation is disabled
- The profile was created in the profiles table
- You're logged in with a valid session

### "404 Not Found" on profiles
This means the profiles table doesn't exist. Re-run the schema.

### "500 Internal Server Error"
This means there are duplicate policies or schema conflicts. Run cleanup.sql first.

### Profile not created after signup
Check that:
1. The trigger `on_auth_user_created` exists in Database → Functions
2. The function `handle_new_user` exists
3. Email confirmation is disabled
