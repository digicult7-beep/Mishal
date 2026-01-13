-- Add avatar_url column to profiles table if it doesn't exist
alter table profiles 
add column if not exists avatar_url text;

-- Optional: Add a comment
comment on column profiles.avatar_url is 'URL to the user''s profile picture in storage';
