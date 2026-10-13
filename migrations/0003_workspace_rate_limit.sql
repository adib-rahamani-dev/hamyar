CREATE TABLE workspace_rate_limit (user_id text PRIMARY KEY REFERENCES auth_user(id) ON DELETE CASCADE, started_at timestamptz NOT NULL DEFAULT now(), count integer NOT NULL DEFAULT 1);
