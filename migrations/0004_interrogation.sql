-- New columns on the existing interviews table.
ALTER TABLE interviews ADD COLUMN arousal INTEGER NOT NULL DEFAULT 20;
ALTER TABLE interviews ADD COLUMN resistance INTEGER NOT NULL DEFAULT 65;
ALTER TABLE interviews ADD COLUMN rapport INTEGER NOT NULL DEFAULT 0;
ALTER TABLE interviews ADD COLUMN belief INTEGER NOT NULL DEFAULT 30;
ALTER TABLE interviews ADD COLUMN police_credibility INTEGER NOT NULL DEFAULT 60;
ALTER TABLE interviews ADD COLUMN coercion INTEGER NOT NULL DEFAULT 0;
ALTER TABLE interviews ADD COLUMN session_no INTEGER NOT NULL DEFAULT 1;
ALTER TABLE interviews ADD COLUMN regressions INTEGER NOT NULL DEFAULT 0;
ALTER TABLE interviews ADD COLUMN disclosure_tier INTEGER NOT NULL DEFAULT 0;
ALTER TABLE interviews ADD COLUMN state_json TEXT NOT NULL DEFAULT '{}';

-- Psychology profile and breaking point on persons.
ALTER TABLE persons ADD COLUMN psychology_json TEXT;
ALTER TABLE persons ADD COLUMN breaking_point INTEGER NOT NULL DEFAULT 60;
