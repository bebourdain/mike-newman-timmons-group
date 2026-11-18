CREATE TABLE "pulls" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pulls_pkey" PRIMARY KEY ("id")
);
