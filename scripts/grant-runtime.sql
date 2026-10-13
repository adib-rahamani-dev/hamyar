-- Run as the migration owner after creating the hamyar_app login with a private credential.
-- This script never creates or displays a password.
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO hamyar_app;
GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO hamyar_app;
REVOKE ALL ON hamyar_migration FROM hamyar_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT,INSERT,UPDATE,DELETE ON TABLES TO hamyar_app;
