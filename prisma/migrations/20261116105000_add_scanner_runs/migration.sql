BEGIN;

CREATE TABLE "scanner_runs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    CONSTRAINT "scanner_runs_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "pulls" ADD COLUMN "run_id" UUID;
ALTER TABLE "pulls" ADD CONSTRAINT "pulls_run_id_fkey"
    FOREIGN KEY ("run_id") REFERENCES "scanner_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "pulls_run_id_source_key" ON "pulls"("run_id", "source");

COMMIT;
