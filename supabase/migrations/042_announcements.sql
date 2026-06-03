-- Create announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  expiry_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Restaurant members can view announcements" ON announcements;
DROP POLICY IF EXISTS "Admins/managers can create announcements" ON announcements;
DROP POLICY IF EXISTS "Admins/managers can delete announcements" ON announcements;

-- RLS policies
CREATE POLICY "Restaurant members can view announcements" ON announcements
  FOR SELECT USING (
    restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Admins/managers can create announcements" ON announcements
  FOR INSERT WITH CHECK (
    restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
    AND author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('owner', 'manager')
    )
  );

CREATE POLICY "Admins/managers can delete announcements" ON announcements
  FOR DELETE USING (
    restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('owner', 'manager')
    )
  );

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_announcements_restaurant_created ON announcements(restaurant_id, created_at DESC);
