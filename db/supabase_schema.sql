-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create Enums
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'client_coordinator', 'employee');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role user_role DEFAULT 'employee',
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add status column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE public.profiles ADD COLUMN status TEXT DEFAULT 'active';
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Create Clients Table
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    cc_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Workspaces Table
CREATE TABLE IF NOT EXISTS public.workspaces (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Departments Table
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Department Employees Table (Many-to-Many)
CREATE TABLE IF NOT EXISTS public.department_employees (
    department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    PRIMARY KEY (department_id, employee_id)
);

-- Create Task Statuses Table
CREATE TABLE IF NOT EXISTS public.task_statuses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    color TEXT DEFAULT '#e2e8f0',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Tasks Table
CREATE TABLE IF NOT EXISTS public.tasks (
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
CREATE TABLE IF NOT EXISTS public.task_time_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ DEFAULT NOW(),
    end_time TIMESTAMPTZ,
    duration_seconds INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Task Assignments Table (Many-to-Many)
CREATE TABLE IF NOT EXISTS public.task_assignments (
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (task_id, user_id)
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
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
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
DROP POLICY IF EXISTS "Allow public read access to all profiles" ON public.profiles;
CREATE POLICY "Allow public read access to all profiles" ON public.profiles
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own profile during signup" ON public.profiles;
CREATE POLICY "Users can insert own profile during signup" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can do everything" ON public.profiles;
CREATE POLICY "Admins can do everything" ON public.profiles
    FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "CC can insert employees" ON public.profiles;
CREATE POLICY "CC can insert employees" ON public.profiles
    FOR INSERT WITH CHECK (public.is_cc());

DROP POLICY IF EXISTS "CC can update created employees" ON public.profiles;
CREATE POLICY "CC can update created employees" ON public.profiles
    FOR UPDATE USING (
        created_by = auth.uid() OR auth.uid() = id
    );

-- RLS Policies for Clients
DROP POLICY IF EXISTS "Admins can manage all clients" ON public.clients;
CREATE POLICY "Admins can manage all clients" ON public.clients 
    FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "CC can manage own clients" ON public.clients;
CREATE POLICY "CC can manage own clients" ON public.clients 
    FOR ALL USING (cc_id = auth.uid());

DROP POLICY IF EXISTS "CC can insert own client" ON public.clients;
CREATE POLICY "CC can insert own client" ON public.clients 
    FOR INSERT WITH CHECK (cc_id = auth.uid());

-- RLS Policies for Workspaces
DROP POLICY IF EXISTS "Admins can manage all workspaces" ON public.workspaces;
CREATE POLICY "Admins can manage all workspaces" ON public.workspaces 
    FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "CC can manage own workspaces" ON public.workspaces;
CREATE POLICY "CC can manage own workspaces" ON public.workspaces 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.clients 
            WHERE id = client_id 
            AND cc_id = auth.uid()
        )
    );

-- RLS Policies for Departments
DROP POLICY IF EXISTS "Admins can manage all departments" ON public.departments;
CREATE POLICY "Admins can manage all departments" ON public.departments 
    FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "CC can manage own departments" ON public.departments;
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
DROP POLICY IF EXISTS "Admins can manage department employees" ON public.department_employees;
CREATE POLICY "Admins can manage department employees" ON public.department_employees 
    FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "CC can manage department employees" ON public.department_employees;
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
DROP POLICY IF EXISTS "Admins can manage all task statuses" ON public.task_statuses;
CREATE POLICY "Admins can manage all task statuses" ON public.task_statuses
    FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "CC can manage task statuses in own departments" ON public.task_statuses;
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

DROP POLICY IF EXISTS "Employees can view task statuses in assigned departments" ON public.task_statuses;
CREATE POLICY "Employees can view task statuses in assigned departments" ON public.task_statuses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.department_employees 
            WHERE department_id = task_statuses.department_id 
            AND employee_id = auth.uid()
        )
    );

-- RLS Policies for Tasks
DROP POLICY IF EXISTS "Admins can manage all tasks" ON public.tasks;
CREATE POLICY "Admins can manage all tasks" ON public.tasks 
    FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "CC can manage tasks in own departments" ON public.tasks;
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

DROP POLICY IF EXISTS "Employees can view assigned tasks" ON public.tasks;
CREATE POLICY "Employees can view assigned tasks" ON public.tasks 
    FOR SELECT USING (assigned_to = auth.uid());

DROP POLICY IF EXISTS "Employees can update assigned tasks" ON public.tasks;
CREATE POLICY "Employees can update assigned tasks" ON public.tasks 
    FOR UPDATE USING (assigned_to = auth.uid());

-- RLS Policies for Task Time Logs
DROP POLICY IF EXISTS "Admins can view all time logs" ON public.task_time_logs;
CREATE POLICY "Admins can view all time logs" ON public.task_time_logs 
    FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "CC can view time logs for own tasks" ON public.task_time_logs;
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

-- Users can manage own time logs
DROP POLICY IF EXISTS "Users can manage own time logs" ON public.task_time_logs;
CREATE POLICY "Users can manage own time logs" ON public.task_time_logs 
    FOR ALL USING (user_id = auth.uid());

-- Enable RLS for Task Assignments
ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Task Assignments
DROP POLICY IF EXISTS "Admins can manage all task assignments" ON public.task_assignments;
CREATE POLICY "Admins can manage all task assignments" ON public.task_assignments
    FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "CC can manage task assignments in own departments" ON public.task_assignments;
CREATE POLICY "CC can manage task assignments in own departments" ON public.task_assignments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.tasks t
            JOIN public.departments d ON d.id = t.department_id
            JOIN public.workspaces w ON w.id = d.workspace_id
            JOIN public.clients c ON c.id = w.client_id
            WHERE t.id = task_id
            AND c.cc_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Employees can view assignments in their departments" ON public.task_assignments;
CREATE POLICY "Employees can view assignments in their departments" ON public.task_assignments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.tasks t
            JOIN public.department_employees de ON de.department_id = t.department_id
            WHERE t.id = task_id
            AND de.employee_id = auth.uid()
        )
    );

-- Create Activities Table
CREATE TABLE IF NOT EXISTS public.activities (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    description TEXT NOT NULL,
    entity_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for Activities
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Activities
DROP POLICY IF EXISTS "Admins can view all activities" ON public.activities;
CREATE POLICY "Admins can view all activities" ON public.activities 
    FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Users can view own activities" ON public.activities;
CREATE POLICY "Users can view own activities" ON public.activities 
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "CC can view activities of their employees" ON public.activities;
CREATE POLICY "CC can view activities of their employees" ON public.activities 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = activities.user_id
            AND p.created_by = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert activities" ON public.activities;
CREATE POLICY "Users can insert activities" ON public.activities 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    type TEXT DEFAULT 'info',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for Notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications 
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications 
    FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert notifications" ON public.notifications;
CREATE POLICY "Users can insert notifications" ON public.notifications 
    FOR INSERT WITH CHECK (true); -- Allow anyone to send notifications for now
