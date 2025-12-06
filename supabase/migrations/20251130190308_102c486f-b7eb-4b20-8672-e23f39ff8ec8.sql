-- Create enum for user roles
CREATE TYPE user_role AS ENUM ('admin', 'supervisor', 'student');

-- Create enum for application status
CREATE TYPE application_status AS ENUM ('pending', 'accepted', 'rejected');

-- Create enum for progress status
CREATE TYPE progress_status AS ENUM ('proposal_submitted', 'proposal_approved', 'in_progress', 'draft_submitted', 'revision_needed', 'final_submitted', 'completed');

-- Create profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone_number TEXT,
  department TEXT,
  student_id TEXT UNIQUE,
  role user_role NOT NULL DEFAULT 'student',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create research_cells table
CREATE TABLE research_cells (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create supervisors table (extends profiles for supervisors)
CREATE TABLE supervisors (
  id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  research_interests TEXT,
  publications JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create supervisor_research_cells junction table
CREATE TABLE supervisor_research_cells (
  supervisor_id UUID REFERENCES supervisors(id) ON DELETE CASCADE,
  research_cell_id UUID REFERENCES research_cells(id) ON DELETE CASCADE,
  PRIMARY KEY (supervisor_id, research_cell_id)
);

-- Create team_member_profiles table
CREATE TABLE team_member_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  preferred_research_cell_id UUID REFERENCES research_cells(id),
  contact_info TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create teams table
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id TEXT NOT NULL UNIQUE,
  creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  member1_name TEXT NOT NULL,
  member1_student_id TEXT NOT NULL,
  member1_email TEXT NOT NULL,
  member1_department TEXT NOT NULL,
  member2_name TEXT,
  member2_student_id TEXT,
  member2_email TEXT,
  member2_department TEXT,
  member3_name TEXT,
  member3_student_id TEXT,
  member3_email TEXT,
  member3_department TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create applications table
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  supervisor_id UUID REFERENCES supervisors(id) ON DELETE CASCADE,
  project_title TEXT NOT NULL,
  project_description TEXT NOT NULL,
  status application_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create progress_updates table
CREATE TABLE progress_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  status progress_status NOT NULL DEFAULT 'proposal_submitted',
  draft_content TEXT,
  supervisor_comments TEXT,
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create messages table (for student-to-student chat)
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create global_notices table (admin posts)
CREATE TABLE global_notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_cells ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervisors ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervisor_research_cells ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_member_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_notices ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Research cells policies (public read, admin write)
CREATE POLICY "Anyone can view research cells" ON research_cells FOR SELECT USING (true);
CREATE POLICY "Admins can manage research cells" ON research_cells FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- Supervisors policies
CREATE POLICY "Anyone can view supervisors" ON supervisors FOR SELECT USING (true);
CREATE POLICY "Admins can manage supervisors" ON supervisors FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- Supervisor research cells policies
CREATE POLICY "Anyone can view supervisor research cells" ON supervisor_research_cells FOR SELECT USING (true);
CREATE POLICY "Admins can manage supervisor research cells" ON supervisor_research_cells FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- Team member profiles policies
CREATE POLICY "Anyone can view team member profiles" ON team_member_profiles FOR SELECT USING (true);
CREATE POLICY "Students can insert their own profile" ON team_member_profiles FOR INSERT WITH CHECK (
  auth.uid() = student_id
);
CREATE POLICY "Students can update their own profile" ON team_member_profiles FOR UPDATE USING (
  auth.uid() = student_id
);

-- Teams policies
CREATE POLICY "Anyone can view teams" ON teams FOR SELECT USING (true);
CREATE POLICY "Students can create teams" ON teams FOR INSERT WITH CHECK (
  auth.uid() = creator_id
);

-- Applications policies
CREATE POLICY "Users can view their related applications" ON applications FOR SELECT USING (
  auth.uid() IN (
    SELECT creator_id FROM teams WHERE teams.id = applications.team_id
  ) OR auth.uid() = applications.supervisor_id
  OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);
CREATE POLICY "Students can create applications" ON applications FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM teams WHERE teams.id = applications.team_id AND teams.creator_id = auth.uid())
);
CREATE POLICY "Supervisors can update applications" ON applications FOR UPDATE USING (
  auth.uid() = applications.supervisor_id
);

-- Progress updates policies
CREATE POLICY "Users can view related progress updates" ON progress_updates FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM applications a
    JOIN teams t ON a.team_id = t.id
    WHERE a.id = progress_updates.application_id
    AND (t.creator_id = auth.uid() OR a.supervisor_id = auth.uid())
  )
);
CREATE POLICY "Team creators and supervisors can add progress" ON progress_updates FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM applications a
    JOIN teams t ON a.team_id = t.id
    WHERE a.id = progress_updates.application_id
    AND (t.creator_id = auth.uid() OR a.supervisor_id = auth.uid())
  )
);

-- Messages policies
CREATE POLICY "Users can view their messages" ON messages FOR SELECT USING (
  auth.uid() = sender_id OR auth.uid() = receiver_id
);
CREATE POLICY "Users can send messages" ON messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id
);
CREATE POLICY "Users can update their received messages" ON messages FOR UPDATE USING (
  auth.uid() = receiver_id
);

-- Notifications policies
CREATE POLICY "Users can view their notifications" ON notifications FOR SELECT USING (
  auth.uid() = user_id
);
CREATE POLICY "System can create notifications" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their notifications" ON notifications FOR UPDATE USING (
  auth.uid() = user_id
);

-- Global notices policies
CREATE POLICY "Anyone can view global notices" ON global_notices FOR SELECT USING (true);
CREATE POLICY "Admins can manage global notices" ON global_notices FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'student')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();