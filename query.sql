SELECT 
    username, 
    email,
    password_hash,
    LENGTH(password_hash) as hash_length,
    LEFT(password_hash, 10) as hash_prefix,
    CASE 
        WHEN password_hash LIKE '%' THEN 'bcrypt'
        WHEN LENGTH(password_hash) = 64 THEN 'sha256'
        WHEN LENGTH(password_hash) < 30 THEN 'plain_text'
        ELSE 'unknown'
    END as hash_type
FROM admins;
