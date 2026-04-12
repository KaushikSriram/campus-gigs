-- ================================================
-- CampusGig: Applications -> Interests refactor
-- ================================================
-- Run this once in Supabase SQL Editor. Safe/idempotent
-- against an existing database with real data.
-- ================================================

-- 1. Add assigned_tasker_id to tasks (tracks who did the work when completed)
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS assigned_tasker_id UUID REFERENCES users(id);

-- 2. Widen tasks.status check constraint to include 'filled'
--    and keep 'in_progress' for backwards compat with old rows.
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks
  ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('open', 'filled', 'in_progress', 'completed', 'cancelled'));

-- 3. Data migration:
--    Any old 'in_progress' tasks become 'filled' under the new model.
UPDATE tasks SET status = 'filled' WHERE status = 'in_progress';

-- 4. Backfill assigned_tasker_id from existing 'completed' task_applications
--    so historical completed tasks still show a winner.
UPDATE tasks t
   SET assigned_tasker_id = ta.tasker_id
  FROM task_applications ta
 WHERE ta.task_id = t.id
   AND ta.status = 'completed'
   AND t.assigned_tasker_id IS NULL;

-- 5. Index for lookups
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_tasker ON tasks(assigned_tasker_id);

-- ================================================
-- Notes:
-- - task_applications table is UNCHANGED. Each row now means
--   "this user is interested in this task." We no longer use
--   the status column for pending/accepted/declined flow; all
--   new rows default to status='pending' and stay there.
-- - The frontend/backend ignore the status column entirely
--   except for historical/legacy 'completed' rows during backfill.
-- ================================================
