-- CLEANUP SCRIPT - Run this FIRST to remove all existing tables and policies
-- WARNING: This will delete all data in these tables

-- Drop all policies first (if tables exist)
DO $$ 
BEGIN
    -- Drop policies for profiles
    DROP POLICY IF EXISTS "Allow public read access to all profiles" ON public.profiles;
    DROP POLICY IF EXISTS "Users can insert own profile during signup" ON public.profiles;
    DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Admins can do everything" ON public.profiles;
    DROP POLICY IF EXISTS "CC can insert employees" ON public.profiles;
    DROP POLICY IF EXISTS "CC can update created employees" ON public.profiles;
    DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
    DROP POLICY IF EXISTS "CC can view created profiles" ON public.profiles;
    DROP POLICY IF EXISTS "Employees can view own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Admins can manage profiles" ON public.profiles;
    DROP POLICY IF EXISTS "CC can manage employees" ON public.profiles;
    
    -- Drop policies for clients
    DROP POLICY IF EXISTS "Admins can manage all clients" ON public.clients;
    DROP POLICY IF EXISTS "CC can manage own clients" ON public.clients;
    
    -- Drop policies for workspaces
    DROP POLICY IF EXISTS "Admins can manage all workspaces" ON public.workspaces;
    DROP POLICY IF EXISTS "CC can manage own workspaces" ON public.workspaces;
    
    -- Drop policies for departments
    DROP POLICY IF EXISTS "Admins can manage all departments" ON public.departments;
    DROP POLICY IF EXISTS "CC can manage own departments" ON public.departments;
    
    -- Drop policies for department_employees
    DROP POLICY IF EXISTS "Admins can manage department employees" ON public.department_employees;
    DROP POLICY IF EXISTS "CC can manage department employees" ON public.department_employees;
    
    -- Drop policies for task_statuses
    DROP POLICY IF EXISTS "Admins can manage all task statuses" ON public.task_statuses;
    DROP POLICY IF EXISTS "CC can manage task statuses in own departments" ON public.task_statuses;
    DROP POLICY IF EXISTS "Employees can view task statuses in assigned departments" ON public.task_statuses;
    
    -- Drop policies for tasks
    DROP POLICY IF EXISTS "Admins can manage all tasks" ON public.tasks;
    DROP POLICY IF EXISTS "CC can manage tasks in own departments" ON public.tasks;
    DROP POLICY IF EXISTS "Employees can view assigned tasks" ON public.tasks;
    DROP POLICY IF EXISTS "Employees can update assigned tasks" ON public.tasks;
    
    -- Drop policies for task_time_logs
    DROP POLICY IF EXISTS "Admins can view all time logs" ON public.task_time_logs;
    DROP POLICY IF EXISTS "CC can view time logs for own tasks" ON public.task_time_logs;
    DROP POLICY IF EXISTS "Users can manage own time logs" ON public.task_time_logs;
END $$;

-- Drop trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Drop helper functions
DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.is_cc();

-- Drop tables (cascade will drop dependent objects)
DROP TABLE IF EXISTS public.task_time_logs CASCADE;
DROP TABLE IF EXISTS public.tasks CASCADE;
DROP TABLE IF EXISTS public.task_statuses CASCADE;
DROP TABLE IF EXISTS public.department_employees CASCADE;
DROP TABLE IF EXISTS public.departments CASCADE;
DROP TABLE IF EXISTS public.workspaces CASCADE;
DROP TABLE IF EXISTS public.clients CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop enum (THIS IS CRITICAL)
DROP TYPE IF EXISTS user_role CASCADE;
