#!/bin/sh
# Runs only for a fresh, dedicated PostgreSQL volume. Never overwrites a database.
set -eu
HAMYAR_BOOTSTRAP_PASSWORD="$(cat /run/secrets/bootstrap_password)"
HAMYAR_SCHEMA_PASSWORD="$(cat /run/secrets/schema_password)"
HAMYAR_APP_PASSWORD="$(cat /run/secrets/app_password)"
if [ "${#HAMYAR_BOOTSTRAP_PASSWORD}" -lt 32 ] || [ "${#HAMYAR_SCHEMA_PASSWORD}" -lt 32 ] || [ "${#HAMYAR_APP_PASSWORD}" -lt 32 ]; then
  echo 'Independent private database passwords of at least 32 characters are required.' >&2
  exit 1
fi
if [ "$HAMYAR_SCHEMA_PASSWORD" = "$HAMYAR_APP_PASSWORD" ] || [ "$HAMYAR_BOOTSTRAP_PASSWORD" = "$HAMYAR_SCHEMA_PASSWORD" ] || [ "$HAMYAR_BOOTSTRAP_PASSWORD" = "$HAMYAR_APP_PASSWORD" ]; then
  echo 'Bootstrap, schema and runtime database credentials must be different.' >&2
  exit 1
fi
export HAMYAR_SCHEMA_PASSWORD HAMYAR_APP_PASSWORD
psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --set=ON_ERROR_STOP=1 <<'SQL'
\getenv schema_password HAMYAR_SCHEMA_PASSWORD
\getenv app_password HAMYAR_APP_PASSWORD
CREATE ROLE hamyar_schema LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS PASSWORD :'schema_password';
CREATE ROLE hamyar_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS PASSWORD :'app_password';
ALTER DATABASE hamyar OWNER TO hamyar_schema;
ALTER SCHEMA public OWNER TO hamyar_schema;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO hamyar_app;
SQL
unset HAMYAR_BOOTSTRAP_PASSWORD HAMYAR_SCHEMA_PASSWORD HAMYAR_APP_PASSWORD
