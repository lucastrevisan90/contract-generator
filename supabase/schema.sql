-- 1. Tabela de Perfis (Sincronizada com Auth.Users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  subscription_status TEXT DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'inactive')),
  is_admin BOOLEAN DEFAULT false,
  password_change_required BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabela de Tarefas
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'completed', 'overdue', 'cancelled')),
  actual_duration_minutes INTEGER,
  completed_at TIMESTAMP WITH TIME ZONE,
  actual_end_at TIMESTAMP WITH TIME ZONE,
  reschedule_count INTEGER DEFAULT 0,
  postponed_count INTEGER DEFAULT 0,
  
  -- Analytics & Recurrence
  overdue_started_at TIMESTAMP WITH TIME ZONE,
  overdue_minutes INTEGER DEFAULT 0,
  extensions_count INTEGER DEFAULT 0,
  extended_minutes_total INTEGER DEFAULT 0,
  pushed_minutes_caused INTEGER DEFAULT 0,
  original_planned_start_at TIMESTAMP WITH TIME ZONE,
  original_planned_end_at TIMESTAMP WITH TIME ZONE,
  
  recurrence_json JSONB, -- Para flexibilidade
  occurrence_json JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabela de Hábitos
CREATE TABLE IF NOT EXISTS habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  color TEXT NOT NULL,
  days_of_week INTEGER[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabela de Conclusão de Hábitos
CREATE TABLE IF NOT EXISTS habit_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  habit_id UUID REFERENCES habits(id) ON DELETE CASCADE NOT NULL,
  completion_date DATE NOT NULL,
  UNIQUE(habit_id, completion_date)
);

-- HABILITAR RLS (Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_completions ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS RLS (Usando DROP para garantir atualização segura)
-- Função auxiliar para checar admin sem recursão (SECURITY DEFINER ignora RLS)
CREATE OR REPLACE FUNCTION public.is_admin_check()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Políticas para Profiles
DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON profiles;
CREATE POLICY "Usuários podem ver seu próprio perfil" ON profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins podem ver tudo" ON profiles;
CREATE POLICY "Admins podem ver tudo" ON profiles FOR SELECT USING (is_admin_check());

DROP POLICY IF EXISTS "Admins e usuários gerenciam perfis" ON profiles;
CREATE POLICY "Admins e usuários gerenciam perfis" ON profiles 
FOR UPDATE USING ( (auth.uid() = id) OR (is_admin_check()) );

DROP POLICY IF EXISTS "Usuários gerenciam suas próprias tarefas" ON tasks;
CREATE POLICY "Usuários gerenciam suas próprias tarefas" ON tasks FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários gerenciam seus próprios hábitos" ON habits;
CREATE POLICY "Usuários gerenciam seus próprios hábitos" ON habits FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários gerenciam suas conclusões de hábitos" ON habit_completions;
CREATE POLICY "Usuários gerenciam suas conclusões de hábitos" ON habit_completions FOR ALL USING (auth.uid() = user_id);

-- GATILHO PARA CRIAR PERFIL AO REGISTRAR NO AUTH
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, password_change_required)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', true)
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Garantir que o gatilho seja recriado sem erro
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
