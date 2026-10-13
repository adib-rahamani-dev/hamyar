ALTER TABLE auth_user ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE auth_session ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE auth_account ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE auth_verification ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE auth_two_factor ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE auth_rate_limit ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
