-- Update admin password to bcrypt hash
UPDATE admins 
SET password_hash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'
WHERE username = 'admin';

-- Update testadmin password to bcrypt hash  
UPDATE admins 
SET password_hash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'
WHERE username = 'testadmin';

-- Verify the update
SELECT 
    username, 
    LEFT(password_hash, 30) as hash_prefix,
    LENGTH(password_hash) as hash_length,
    CASE 
        WHEN password_hash LIKE '$%' THEN 'bcrypt'
        WHEN password_hash LIKE '$%' THEN 'bcrypt'
        ELSE 'other'
    END as hash_type
FROM admins;
