CREATE TYPE "PullStatus" AS ENUM ('Unverified', 'Success', 'Partial', 'Failed');
ALTER TABLE "pulls"
  ADD COLUMN "status" "PullStatus" NOT NULL DEFAULT 'Unverified',
  ADD COLUMN "failure_reason" TEXT,
  ADD CONSTRAINT "pull_failure_reason_required" CHECK (
    ("status" IN ('Partial', 'Failed') AND length(btrim(coalesce("failure_reason", ''))) > 0)
    OR ("status" IN ('Unverified', 'Success') AND "failure_reason" IS NULL)
  );
CREATE INDEX "pulls_status_idx" ON "pulls"("status");

-- Runs save through Prisma and external import scripts. Enforce propagation at
-- the database boundary so a direct Pull write cannot skip source tagging.
CREATE FUNCTION propagate_pull_failure() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  failure_summary TEXT;
BEGIN
  IF NEW.status NOT IN ('Partial', 'Failed') THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' THEN
    IF NEW.status IS NOT DISTINCT FROM OLD.status
       AND NEW.failure_reason IS NOT DISTINCT FROM OLD.failure_reason
       AND NEW.source IS NOT DISTINCT FROM OLD.source THEN RETURN NEW; END IF;
  END IF;
  failure_summary := format('Pull %s | Run %s | %s | %s: %s',
    NEW.id, coalesce(NEW.run_id::text, 'unassigned'),
    to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS') || ' UTC',
    NEW.status, NEW.failure_reason);
  UPDATE project_scanners
  SET known_failures = true,
      failure_notes = failure_summary || CASE WHEN nullif(failure_notes, '') IS NULL THEN '' ELSE E'\n\n' || failure_notes END
  WHERE web_address = NEW.source;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "pull_failure_source_flags"
AFTER INSERT OR UPDATE OF status, failure_reason, source ON "pulls"
FOR EACH ROW EXECUTE FUNCTION propagate_pull_failure();
