-- Add reply tracking columns to contact_messages
ALTER TABLE contact_messages 
ADD COLUMN IF NOT EXISTS replied_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS replied_by UUID,
ADD COLUMN IF NOT EXISTS reply_content TEXT;

-- Add index for faster queries on unreplied messages
CREATE INDEX IF NOT EXISTS idx_contact_messages_replied_at ON contact_messages(replied_at) WHERE replied_at IS NULL;