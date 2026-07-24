-- Add results_payload column to test_assignments
alter table if exists public.test_assignments
add column if not exists results_payload jsonb default null;

-- Create index for performance
create index if not exists test_assignments_results_payload_idx on test_assignments using gin(results_payload);
