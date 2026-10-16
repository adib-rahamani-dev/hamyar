-- Collaborative classroom data stays in the same tenant-scoped PostgreSQL.
ALTER TABLE room_assignment ADD COLUMN board_allowed boolean NOT NULL DEFAULT false;
ALTER TABLE room_assignment ADD COLUMN audio_allowed boolean NOT NULL DEFAULT false;
ALTER TABLE room_assignment ADD COLUMN camera_allowed boolean NOT NULL DEFAULT false;
ALTER TABLE room_assignment ADD COLUMN screen_allowed boolean NOT NULL DEFAULT false;
ALTER TABLE room_assignment ADD COLUMN grant_expires_at timestamptz;
CREATE TABLE classroom_message (
 id text PRIMARY KEY, organization_id text NOT NULL, room_id text NOT NULL,
 user_id text NOT NULL REFERENCES auth_user(id), client_id text NOT NULL,
 body text NOT NULL CHECK(length(body) BETWEEN 1 AND 2000), hidden boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(organization_id,room_id,user_id,client_id),
 FOREIGN KEY(organization_id,room_id) REFERENCES meeting_room(organization_id,id)
);
CREATE INDEX classroom_message_room_idx ON classroom_message(organization_id,room_id,created_at DESC);
CREATE TABLE classroom_board (
 organization_id text NOT NULL, room_id text NOT NULL, revision integer NOT NULL DEFAULT 0,
 strokes jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(strokes)='array' AND jsonb_array_length(strokes)<=200),
 updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(organization_id,room_id),
 FOREIGN KEY(organization_id,room_id) REFERENCES meeting_room(organization_id,id)
);
CREATE TABLE classroom_presence (
 organization_id text NOT NULL, room_id text NOT NULL, user_id text NOT NULL REFERENCES auth_user(id),
 raised_hand boolean NOT NULL DEFAULT false, last_seen timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(organization_id,room_id,user_id),
 FOREIGN KEY(organization_id,room_id) REFERENCES meeting_room(organization_id,id)
);
CREATE INDEX classroom_presence_recent_idx ON classroom_presence(organization_id,room_id,last_seen);
CREATE TABLE classroom_link (
 id text PRIMARY KEY, organization_id text NOT NULL, room_id text NOT NULL,
 token_hash text NOT NULL UNIQUE, expires_at timestamptz NOT NULL,
 max_uses integer NOT NULL CHECK(max_uses BETWEEN 1 AND 200), uses integer NOT NULL DEFAULT 0,
 revoked boolean NOT NULL DEFAULT false, created_by text NOT NULL REFERENCES auth_user(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(organization_id,room_id) REFERENCES meeting_room(organization_id,id)
);
CREATE TABLE organization_brand (
 organization_id text PRIMARY KEY REFERENCES organization(id), display_name text NOT NULL CHECK(length(display_name) BETWEEN 2 AND 80),
 tone text NOT NULL DEFAULT 'emerald' CHECK(tone IN ('emerald','ocean','violet')),
 welcome text NOT NULL DEFAULT '' CHECK(length(welcome)<=240), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE support_ticket (
 id text PRIMARY KEY, organization_id text NOT NULL REFERENCES organization(id), user_id text NOT NULL REFERENCES auth_user(id),
 title text NOT NULL CHECK(length(title) BETWEEN 3 AND 120), body text NOT NULL CHECK(length(body) BETWEEN 5 AND 4000),
 priority text NOT NULL CHECK(priority IN ('normal','high')), status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','answered','closed')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(organization_id,id)
);
CREATE TABLE support_reply (
 id text PRIMARY KEY, organization_id text NOT NULL, ticket_id text NOT NULL,
 user_id text NOT NULL REFERENCES auth_user(id), body text NOT NULL CHECK(length(body) BETWEEN 1 AND 4000),
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(organization_id,ticket_id) REFERENCES support_ticket(organization_id,id)
);
-- FORCE RLS is defense in depth; every service also resolves fresh membership and room ACL.
ALTER TABLE classroom_message ENABLE ROW LEVEL SECURITY;
ALTER TABLE classroom_message FORCE ROW LEVEL SECURITY;
CREATE POLICY message_tenant ON classroom_message FOR ALL USING(organization_id=current_setting('app.tenant_id',true)) WITH CHECK(organization_id=current_setting('app.tenant_id',true));
ALTER TABLE classroom_board ENABLE ROW LEVEL SECURITY;
ALTER TABLE classroom_board FORCE ROW LEVEL SECURITY;
CREATE POLICY board_tenant ON classroom_board FOR ALL USING(organization_id=current_setting('app.tenant_id',true)) WITH CHECK(organization_id=current_setting('app.tenant_id',true));
ALTER TABLE classroom_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE classroom_presence FORCE ROW LEVEL SECURITY;
CREATE POLICY presence_tenant ON classroom_presence FOR ALL USING(organization_id=current_setting('app.tenant_id',true)) WITH CHECK(organization_id=current_setting('app.tenant_id',true));
ALTER TABLE classroom_link ENABLE ROW LEVEL SECURITY;
ALTER TABLE classroom_link FORCE ROW LEVEL SECURITY;
-- An opaque bearer link proves access to exactly this room, never email ownership.
CREATE POLICY link_read ON classroom_link FOR SELECT USING(organization_id=current_setting('app.tenant_id',true) OR token_hash=current_setting('app.room_link_hash',true));
CREATE POLICY link_write ON classroom_link FOR ALL USING(organization_id=current_setting('app.tenant_id',true)) WITH CHECK(organization_id=current_setting('app.tenant_id',true));
ALTER TABLE organization_brand ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_brand FORCE ROW LEVEL SECURITY;
CREATE POLICY brand_tenant ON organization_brand FOR ALL USING(organization_id=current_setting('app.tenant_id',true)) WITH CHECK(organization_id=current_setting('app.tenant_id',true));
ALTER TABLE support_ticket ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket FORCE ROW LEVEL SECURITY;
CREATE POLICY ticket_tenant ON support_ticket FOR ALL USING(organization_id=current_setting('app.tenant_id',true)) WITH CHECK(organization_id=current_setting('app.tenant_id',true));
ALTER TABLE support_reply ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_reply FORCE ROW LEVEL SECURITY;
CREATE POLICY reply_tenant ON support_reply FOR ALL USING(organization_id=current_setting('app.tenant_id',true)) WITH CHECK(organization_id=current_setting('app.tenant_id',true));
