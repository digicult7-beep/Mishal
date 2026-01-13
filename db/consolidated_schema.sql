-- CONSOLIDATED SETUP SCRIPT
-- Run this entire script in Supabase SQL Editor to fix everything

-- 1. CLEANUP (Drop everything to start fresh)
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

DROP POLICY IF EXISTS "Admins can manage all clients" ON public.clients;
DROP POLICY IF EXISTS "CC can manage own clients" ON public.clients;

DROP POLICY IF EXISTS "Admins can manage all workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "CC can manage own workspaces" ON public.workspaces;

DROP POLICY IF EXISTS "Admins can manage all departments" ON public.departments;
DROP POLICY IF EXISTS "CC can manage own departments" ON public.departments;

DROP POLICY IF EXISTS "Admins can manage department employees" ON public.department_employees;
DROP POLICY IF EXISTS "CC can manage department employees" ON public.department_employees;

DROP POLICY IF EXISTS "Admins can manage all task statuses" ON public.task_statuses;
DROP POLICY IF EXISTS "CC can manage task statuses in own departments" ON public.task_statuses;
DROP POLICY IF EXISTS "Employees can view task statuses in assigned departments" ON public.task_statuses;

DROP POLICY IF EXISTS "Admins can manage all tasks" ON public.tasks;
DROP POLICY IF EXISTS "CC can manage tasks in own departments" ON public.tasks;
DROP POLICY IF EXISTS "Employees can view assigned tasks" ON public.tasks;
DROP POLICY IF EXISTS "Employees can update assigned tasks" ON public.tasks;

DROP POLICY IF EXISTS "Admins can view all time logs" ON public.task_time_logs;
DROP POLICY IF EXISTS "CC can view time logs for own tasks" ON public.task_time_logs;
DROP POLICY IF EXISTS "Users can manage own time logs" ON public.task_time_logs;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.is_cc();

DROP TABLE IF EXISTS public.task_time_logs CASCADE;
DROP TABLE IF EXISTS public.tasks CASCADE;
DROP TABLE IF EXISTS public.task_statuses CASCADE;
DROP TABLE IF EXISTS public.department_employees CASCADE;
DROP TABLE IF EXISTS public.departments CASCADE;
DROP TABLE IF EXISTS public.workspaces CASCADE;
DROP TABLE IF EXISTS public.clients CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

DROP TYPE IF EXISTS user_role CASCADE;

-- 2. SETUP (Create tables and policies)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create Enums
CREATE TYPE user_role AS ENUM ('admin', 'client_coordinator', 'employee');

-- Create Profiles Table
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role user_role DEFAULT 'employee',
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Clients Table
CREATE TABLE public.clients (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    cc_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Workspaces Table
CREATE TABLE public.workspaces (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Departments Table
CREATE TABLE public.departments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Department Employees Table (Many-to-Many)
CREATE TABLE public.department_employees (
    department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    PRIMARY KEY (department_id, employee_id)
);

-- Create Task Statuses Table
CREATE TABLE public.task_statuses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    color TEXT DEFAULT '#e2e8f0',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Tasks Table
CREATE TABLE public.tasks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status_id UUID REFERENCES public.task_statuses(id) ON DELETE SET NULL,
    priority TEXT DEFAULT 'medium',
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    due_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Task Time Logs Table
CREATE TABLE public.task_time_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ DEFAULT NOW(),
    end_time TIMESTAMPTZ,
    duration_seconds INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Helper Functions for RLS (Prevent Recursion)
CREATE OR REPLACE FUNCTION public.is_admin() 
RETURNS BOOLEAN 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.is_cc() 
RETURNS BOOLEAN 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'client_coordinator'
  );
END;
$$ LANGUAGE plpgsql;

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    COALESCE((new.raw_user_meta_data->>'role')::user_role, 'employee')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_time_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Profiles
CREATE POLICY "Allow public read access to all profiles" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can insert own profile during signup" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can do everything" ON public.profiles
    FOR ALL USING (public.is_admin());

CREATE POLICY "CC can insert employees" ON public.profiles
    FOR INSERT WITH CHECK (public.is_cc());

CREATE POLICY "CC can update created employees" ON public.profiles
    FOR UPDATE USING (
        created_by = auth.uid() OR auth.uid() = id
    );

-- RLS Policies for Clients
CREATE POLICY "Admins can manage all clients" ON public.clients 
    FOR ALL USING (public.is_admin());

CREATE POLICY "CC can manage own clients" ON public.clients 
    FOR ALL USING (cc_id = auth.uid());

-- RLS Policies for Workspaces
CREATE POLICY "Admins can manage all workspaces" ON public.workspaces 
    FOR ALL USING (public.is_admin());

CREATE POLICY "CC can manage own workspaces" ON public.workspaces 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.clients 
            WHERE id = client_id 
            AND cc_id = auth.uid()
        )
    );

-- RLS Policies for Departments
CREATE POLICY "Admins can manage all departments" ON public.departments 
    FOR ALL USING (public.is_admin());

CREATE POLICY "CC can manage own departments" ON public.departments 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.workspaces w
            JOIN public.clients c ON c.id = w.client_id
            WHERE w.id = workspace_id 
            AND c.cc_id = auth.uid()
        )
    );

-- RLS Policies for Department Employees
CREATE POLICY "Admins can manage department employees" ON public.department_employees 
    FOR ALL USING (public.is_admin());

CREATE POLICY "CC can manage department employees" ON public.department_employees 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.departments d
            JOIN public.workspaces w ON w.id = d.workspace_id
            JOIN public.clients c ON c.id = w.client_id
            WHERE d.id = department_id 
            AND c.cc_id = auth.uid()
        )
    );

-- RLS Policies for Task Statuses
CREATE POLICY "Admins can manage all task statuses" ON public.task_statuses
    FOR ALL USING (public.is_admin());

CREATE POLICY "CC can manage task statuses in own departments" ON public.task_statuses
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.departments d
            JOIN public.workspaces w ON w.id = d.workspace_id
            JOIN public.clients c ON c.id = w.client_id
            WHERE d.id = department_id 
            AND c.cc_id = auth.uid()
        )
    );

CREATE POLICY "Employees can view task statuses in assigned departments" ON public.task_statuses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.department_employees 
            WHERE department_id = task_statuses.department_id 
            AND employee_id = auth.uid()
        )
    );

-- RLS Policies for Tasks
CREATE POLICY "Admins can manage all tasks" ON public.tasks 
    FOR ALL USING (public.is_admin());

CREATE POLICY "CC can manage tasks in own departments" ON public.tasks 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.departments d
            JOIN public.workspaces w ON w.id = d.workspace_id
            JOIN public.clients c ON c.id = w.client_id
            WHERE d.id = department_id 
            AND c.cc_id = auth.uid()
        )
    );

CREATE POLICY "Employees can view assigned tasks" ON public.tasks 
    FOR SELECT USING (assigned_to = auth.uid());

CREATE POLICY "Employees can update assigned tasks" ON public.tasks 
    FOR UPDATE USING (assigned_to = auth.uid());

-- RLS Policies for Task Time Logs
CREATE POLICY "Admins can view all time logs" ON public.task_time_logs 
    FOR SELECT USING (public.is_admin());

CREATE POLICY "CC can view time logs for own tasks" ON public.task_time_logs 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.tasks t
            JOIN public.departments d ON d.id = t.department_id
            JOIN public.workspaces w ON w.id = d.workspace_id
            JOIN public.clients c ON c.id = w.client_id
            WHERE t.id = task_id 
            AND c.cc_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage own time logs" ON public.task_time_logs 
    FOR ALL USING (user_id = auth.uid());

-- Grant permissions to authenticated users
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated;
