-- ========================================
-- CampusGig - Supabase Database Setup
-- Run this in Supabase SQL Editor
-- ========================================

-- Drop existing tables (order matters for foreign keys)
DROP TABLE IF EXISTS blocks CASCADE;
DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS task_applications CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop the old RPC function if it exists
DROP FUNCTION IF EXISTS get_conversations(BIGINT);

-- ========================================
-- Users
-- ========================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  profile_photo TEXT,
  bio TEXT DEFAULT '',
  payment_handle TEXT DEFAULT '',
  university TEXT NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  verification_token TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  cancellation_count INTEGER DEFAULT 0,
  is_suspended BOOLEAN DEFAULT FALSE
);

-- ========================================
-- Tasks
-- ========================================
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poster_id UUID NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT '',
  date_time TEXT NOT NULL DEFAULT '',
  date_type TEXT DEFAULT 'specific',
  estimated_duration TEXT DEFAULT '',
  offered_pay FLOAT NOT NULL,
  helpers_needed INTEGER DEFAULT 1,
  helpers_accepted INTEGER DEFAULT 0,
  photos TEXT DEFAULT '[]',
  status TEXT DEFAULT 'open' CHECK(status IN ('open','filled','in_progress','completed','cancelled')),
  assigned_tasker_id UUID REFERENCES users(id),
  university TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- Task Applications
-- ========================================
CREATE TABLE task_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id),
  tasker_id UUID NOT NULL REFERENCES users(id),
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','accepted','declined','completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, tasker_id)
);

-- ========================================
-- Messages
-- ========================================
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id),
  sender_id UUID NOT NULL REFERENCES users(id),
  receiver_id UUID NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- Reviews
-- ========================================
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id),
  reviewer_id UUID NOT NULL REFERENCES users(id),
  reviewee_id UUID NOT NULL REFERENCES users(id),
  rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
  comment TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, reviewer_id)
);

-- ========================================
-- Notifications
-- ========================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- Reports
-- ========================================
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES users(id),
  reported_id UUID NOT NULL REFERENCES users(id),
  task_id UUID REFERENCES tasks(id),
  reason TEXT NOT NULL,
  details TEXT DEFAULT '',
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- Blocks
-- ========================================
CREATE TABLE blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES users(id),
  blocked_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);

-- ========================================
-- Indexes
-- ========================================
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_poster ON tasks(poster_id);
CREATE INDEX idx_tasks_university ON tasks(university);
CREATE INDEX idx_task_applications_task ON task_applications(task_id);
CREATE INDEX idx_task_applications_tasker ON task_applications(tasker_id);
CREATE INDEX idx_messages_task ON messages(task_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_receiver ON messages(receiver_id);
CREATE INDEX idx_reviews_reviewee ON reviews(reviewee_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_blocks_blocker ON blocks(blocker_id);

-- ========================================
-- Row Level Security (allow all — auth handled in Express)
-- ========================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON task_applications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON reviews FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON notifications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON reports FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON blocks FOR ALL USING (true) WITH CHECK (true);
