-- Aurora Conversation Storage Schema
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Device settings table for per-device configuration
CREATE TABLE IF NOT EXISTS device_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT UNIQUE NOT NULL,
  system_prompt TEXT NOT NULL DEFAULT 'You are Aurora, a helpful AI assistant responding in short sentences for voice conversations. You are friendly, helpful, and maintain context across the conversation.',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for device_settings
CREATE INDEX IF NOT EXISTS idx_device_settings_device_id ON device_settings(device_id);

-- Create indexes for conversations
CREATE INDEX IF NOT EXISTS idx_conversations_device_id ON conversations(device_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  image TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for messages
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to update conversations.updated_at when a new message is added
CREATE OR REPLACE TRIGGER update_conversation_timestamp
    BEFORE UPDATE ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create trigger to update device_settings.updated_at
CREATE OR REPLACE TRIGGER update_device_settings_timestamp
    BEFORE UPDATE ON device_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE device_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow all operations on device_settings" ON device_settings;
DROP POLICY IF EXISTS "Allow all operations on conversations" ON conversations;
DROP POLICY IF EXISTS "Allow all operations on messages" ON messages;

-- Create policies (allow all for now, you can customize based on your needs)
-- These policies allow all operations for authenticated and service role
CREATE POLICY "Allow all operations on device_settings" ON device_settings
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "Allow all operations on conversations" ON conversations
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "Allow all operations on messages" ON messages
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- Optional: Create a policy that restricts access by device_id
-- Uncomment and modify if you want device-specific access control
-- CREATE POLICY "Users can only access their own conversations" ON conversations
--   FOR ALL USING (device_id = current_setting('request.jwt.claims')::json->>'device_id');

-- Create a view for conversation summaries (optional, for analytics)
CREATE OR REPLACE VIEW conversation_summaries AS
SELECT 
  c.id,
  c.device_id,
  c.created_at,
  c.updated_at,
  COUNT(m.id) as message_count,
  MAX(m.created_at) as last_message_at
FROM conversations c
LEFT JOIN messages m ON c.id = m.conversation_id
GROUP BY c.id, c.device_id, c.created_at, c.updated_at;