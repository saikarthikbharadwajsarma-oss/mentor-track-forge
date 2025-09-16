-- Create profiles table for user data with roles
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'intern' CHECK (role IN ('intern', 'employee', 'admin')),
  department TEXT,
  bio TEXT,
  avatar_url TEXT,
  points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tasks table
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  points INTEGER NOT NULL DEFAULT 10,
  due_date TIMESTAMP WITH TIME ZONE,
  assignee_id UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create chat messages table
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  sender_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create file uploads table
CREATE TABLE public.file_uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_uploads ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Tasks policies
CREATE POLICY "Users can view tasks assigned to them or created by them" ON public.tasks 
  FOR SELECT USING (
    assignee_id = auth.uid() OR 
    created_by = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('admin', 'employee'))
  );

CREATE POLICY "Employees and admins can create tasks" ON public.tasks 
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('admin', 'employee'))
  );

CREATE POLICY "Employees and admins can update tasks" ON public.tasks 
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('admin', 'employee'))
  );

CREATE POLICY "Admins can delete tasks" ON public.tasks 
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Chat messages policies
CREATE POLICY "Users can view messages they sent or received" ON public.chat_messages 
  FOR SELECT USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "Users can send messages" ON public.chat_messages 
  FOR INSERT WITH CHECK (sender_id = auth.uid());

-- File uploads policies
CREATE POLICY "Users can view their own uploads and task-related uploads" ON public.file_uploads 
  FOR SELECT USING (
    uploaded_by = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.tasks WHERE id = file_uploads.task_id AND assignee_id = auth.uid())
  );

CREATE POLICY "Users can upload files" ON public.file_uploads 
  FOR INSERT WITH CHECK (uploaded_by = auth.uid());

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to calculate and update user points
CREATE OR REPLACE FUNCTION public.calculate_user_points()
RETURNS TRIGGER AS $$
DECLARE
  points_to_add INTEGER := 0;
  points_to_subtract INTEGER := 0;
BEGIN
  -- When task is completed
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    points_to_add := NEW.points;
  END IF;
  
  -- When task becomes overdue
  IF NEW.status = 'overdue' AND OLD.status != 'overdue' THEN
    points_to_subtract := 5;
  END IF;
  
  -- Update user points
  IF points_to_add > 0 THEN
    UPDATE public.profiles 
    SET points = points + points_to_add 
    WHERE user_id = NEW.assignee_id;
  END IF;
  
  IF points_to_subtract > 0 THEN
    UPDATE public.profiles 
    SET points = GREATEST(0, points - points_to_subtract)
    WHERE user_id = NEW.assignee_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for points calculation
CREATE TRIGGER update_user_points
  AFTER UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_user_points();

-- Create storage bucket for file uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('uploads', 'uploads', false);

-- Create storage policies
CREATE POLICY "Users can view their own uploads" ON storage.objects 
  FOR SELECT USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload files" ON storage.objects 
  FOR INSERT WITH CHECK (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own files" ON storage.objects 
  FOR UPDATE USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);