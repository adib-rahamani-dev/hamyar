CREATE TABLE meeting_room (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organization(id),
  title text NOT NULL CHECK(length(title) BETWEEN 2 AND 120),
  state text NOT NULL DEFAULT 'scheduled' CHECK(state IN ('scheduled','open','ended')),
  locked boolean NOT NULL DEFAULT false,
  created_by text NOT NULL REFERENCES auth_user(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id,id)
);
CREATE INDEX meeting_room_tenant_created_idx ON meeting_room(organization_id,created_at DESC);
CREATE TABLE room_assignment (
  id text PRIMARY KEY,
  organization_id text NOT NULL,
  room_id text NOT NULL,
  membership_id text NOT NULL,
  role text NOT NULL CHECK(role IN ('host','presenter','attendee')),
  admitted boolean NOT NULL DEFAULT false,
  banned boolean NOT NULL DEFAULT false,
  UNIQUE(organization_id,room_id,membership_id),
  FOREIGN KEY(organization_id,room_id) REFERENCES meeting_room(organization_id,id),
  FOREIGN KEY(organization_id,membership_id) REFERENCES membership(organization_id,id)
);
CREATE INDEX room_assignment_membership_idx ON room_assignment(organization_id,membership_id,room_id);
ALTER TABLE meeting_room ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_room FORCE ROW LEVEL SECURITY;
CREATE POLICY room_tenant ON meeting_room FOR ALL USING(organization_id=current_setting('app.tenant_id',true)) WITH CHECK(organization_id=current_setting('app.tenant_id',true));
ALTER TABLE room_assignment ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_assignment FORCE ROW LEVEL SECURITY;
CREATE POLICY assignment_tenant ON room_assignment FOR ALL USING(organization_id=current_setting('app.tenant_id',true)) WITH CHECK(organization_id=current_setting('app.tenant_id',true));
