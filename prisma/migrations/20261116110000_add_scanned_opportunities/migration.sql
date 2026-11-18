CREATE UNIQUE INDEX "pulls_run_id_id_key" ON "pulls"("run_id", "id");

CREATE TABLE "scanned_opportunities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "run_id" UUID NOT NULL,
    "pull_id" UUID NOT NULL,
    "opportunity_key" TEXT NOT NULL,
    "jurisdiction" TEXT NOT NULL,
    "issuing_agency" TEXT,
    "title" TEXT NOT NULL,
    "scope" TEXT,
    "status" TEXT NOT NULL,
    "solicitation_id" TEXT,
    "deadline_date" DATE,
    "deadline_at" TIMESTAMP(3),
    "deadline_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "planned_funding" DECIMAL(18,2),
    "fiscal_years" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
    "official_url" TEXT,
    "change_summary" TEXT,
    CONSTRAINT "scanned_opportunities_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "scanned_opportunities_run_id_pull_id_fkey"
        FOREIGN KEY ("run_id", "pull_id") REFERENCES "pulls"("run_id", "id")
        ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "scanned_opportunities_run_id_opportunity_key_key"
    ON "scanned_opportunities"("run_id", "opportunity_key");
