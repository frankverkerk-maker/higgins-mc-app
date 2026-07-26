-- ============================================================
-- MIGRATION: Rename Elena (Executive Assistant) → Nathalie
-- Target: Higgins Mission Control Cloud Database
-- Date: 2026-07-26
-- Note: Elena Vasquez (JLC, International Law) is NOT affected
-- ============================================================

-- Step 1: Update the agents table
UPDATE agents 
SET name = 'Nathalie' 
WHERE name = 'Elena' 
  AND role = 'Executive Assistant' 
  AND department = 'Executive Office';

-- Step 2: Update building_floors description
UPDATE building_floors 
SET description = REPLACE(description, 'Elena', 'Nathalie') 
WHERE description LIKE '%Elena%' 
  AND description NOT LIKE '%Vasquez%';

-- Step 3: Update any chat history references (if applicable)
-- This preserves historical context while updating the display name
UPDATE chat_messages 
SET content = REPLACE(content, 'Elena', 'Nathalie') 
WHERE content LIKE '%Elena%' 
  AND content NOT LIKE '%Vasquez%'
  AND role = 'assistant';

-- Step 4: Verify the migration
SELECT name, role, department FROM agents WHERE name = 'Nathalie';
SELECT name, role, department FROM agents WHERE name LIKE '%Elena%';

-- Expected result:
-- Nathalie | Executive Assistant | Executive Office
-- Elena Vasquez | International Law | Justitia Legal Council (unchanged)

-- ============================================================
-- ROLLBACK (if needed):
-- UPDATE agents SET name = 'Elena' WHERE name = 'Nathalie' AND role = 'Executive Assistant';
-- ============================================================
