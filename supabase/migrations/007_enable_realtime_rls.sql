-- Enable RLS on conversations and messages
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (to prevent conflicts)
DROP POLICY IF EXISTS "Users can only view their own company's conversations" ON conversations;
DROP POLICY IF EXISTS "Users can only view messages of their own company's conversations" ON messages;

-- Create policies for SELECT
CREATE POLICY "Users can only view their own company's conversations"
ON conversations
FOR SELECT
TO authenticated
USING (
  company_id IN (
    SELECT id FROM companies WHERE email = auth.jwt()->>'email'
  )
);

CREATE POLICY "Users can only view messages of their own company's conversations"
ON messages
FOR SELECT
TO authenticated
USING (
  conversation_id IN (
    SELECT id FROM conversations WHERE company_id IN (
      SELECT id FROM companies WHERE email = auth.jwt()->>'email'
    )
  )
);

-- Ensure tables are in the realtime publication
-- We use a safe block or direct commands to add tables to publication if they are not already there
BEGIN;
  -- If publication does not exist, it will be handled by Supabase defaults
  -- We attempt to add the tables to supabase_realtime publication
  ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
  ALTER PUBLICATION supabase_realtime ADD TABLE messages;
COMMIT;
