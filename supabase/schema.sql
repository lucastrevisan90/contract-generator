-- Create Categories table
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Templates table
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  file_path TEXT NOT NULL, -- Path in Supabase Storage
  placeholders JSONB DEFAULT '[]', -- Array of strings detected in the docx
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Contracts table (History)
CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id),
  contractor_name TEXT,
  contract_value TEXT,
  file_path TEXT NOT NULL, -- Path to generated .docx in Storage
  metadata JSONB, -- Values used for placeholders
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Contractor Settings (Fixed data)
CREATE TABLE contractor_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) UNIQUE,
  name TEXT,
  document TEXT, -- CNPJ or CPF
  address TEXT,
  phone TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractor_settings ENABLE ROW LEVEL SECURITY;

-- Basic Policies (Simplified for now)
CREATE POLICY "Public read on categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Auth users can handle templates" ON templates FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Users can only see their own contracts" ON contracts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can handle their own settings" ON contractor_settings FOR ALL USING (auth.uid() = user_id);

-- Insert a default category
INSERT INTO categories (name) VALUES ('Prestação de Serviços'), ('Aluguel'), ('Venda e Compra');
