-- Create the prompt_vault table
CREATE TABLE prompt_vault (
  id INTEGER PRIMARY KEY DEFAULT 1,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE prompt_vault ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (since this is a personal app)
-- For production, you'd want user-specific policies
CREATE POLICY "Allow all operations" ON prompt_vault
  FOR ALL USING (true)
  WITH CHECK (true);

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_prompt_vault_updated_at
  BEFORE UPDATE ON prompt_vault
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert initial row (the app expects id = 1)
INSERT INTO prompt_vault (id, data)
VALUES (1, '{"categories": [], "prompts": []}')
ON CONFLICT (id) DO NOTHING;