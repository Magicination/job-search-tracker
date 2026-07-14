-- Remove 'screen' status from application_status_history table
DELETE FROM application_status_history 
WHERE to_status = 'screen' OR from_status = 'screen';

-- Remove any existing applications with 'screen' status
DELETE FROM applications 
WHERE status = 'screen';

-- Drop the column if it contains only screen values (comment for safety)
-- ALTER TABLE applications ALTER COLUMN status DROP NOT NULL;
