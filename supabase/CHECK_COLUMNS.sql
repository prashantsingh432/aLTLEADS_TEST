-- Check actual columns in prospects table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'prospects'
ORDER BY ordinal_position;
