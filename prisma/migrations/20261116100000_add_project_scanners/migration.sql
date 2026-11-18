CREATE TABLE "project_scanners" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "parent_id" UUID,
    "web_address" TEXT,
    "notes" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "project_scanners_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "project_scanners_parent_id_fkey" FOREIGN KEY ("parent_id")
        REFERENCES "project_scanners"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "project_scanners_not_own_parent" CHECK ("id" <> "parent_id")
);

CREATE INDEX "project_scanners_parent_id_position_idx" ON "project_scanners"("parent_id", "position");

INSERT INTO "project_scanners" ("id", "title", "parent_id", "position") VALUES
    ('c712ca00-13cd-49cb-a760-000000000001', 'District of Columbia', NULL, 0),
    ('c712ca00-13cd-49cb-a760-000000000101', 'Washington, D.C.', 'c712ca00-13cd-49cb-a760-000000000001', 0),
    ('c712ca00-13cd-49cb-a760-000000000002', 'Maryland counties', NULL, 1),
    ('c712ca00-13cd-49cb-a760-000000000201', 'Anne Arundel', 'c712ca00-13cd-49cb-a760-000000000002', 0),
    ('c712ca00-13cd-49cb-a760-000000000202', 'Calvert', 'c712ca00-13cd-49cb-a760-000000000002', 1),
    ('c712ca00-13cd-49cb-a760-000000000203', 'Charles', 'c712ca00-13cd-49cb-a760-000000000002', 2),
    ('c712ca00-13cd-49cb-a760-000000000204', 'Frederick', 'c712ca00-13cd-49cb-a760-000000000002', 3),
    ('c712ca00-13cd-49cb-a760-000000000205', 'Howard', 'c712ca00-13cd-49cb-a760-000000000002', 4),
    ('c712ca00-13cd-49cb-a760-000000000206', 'Montgomery', 'c712ca00-13cd-49cb-a760-000000000002', 5),
    ('c712ca00-13cd-49cb-a760-000000000207', 'Prince George’s', 'c712ca00-13cd-49cb-a760-000000000002', 6),
    ('c712ca00-13cd-49cb-a760-000000000208', 'St. Mary’s', 'c712ca00-13cd-49cb-a760-000000000002', 7),
    ('c712ca00-13cd-49cb-a760-000000000003', 'Virginia counties', NULL, 2),
    ('c712ca00-13cd-49cb-a760-000000000301', 'Arlington', 'c712ca00-13cd-49cb-a760-000000000003', 0),
    ('c712ca00-13cd-49cb-a760-000000000302', 'Clarke', 'c712ca00-13cd-49cb-a760-000000000003', 1),
    ('c712ca00-13cd-49cb-a760-000000000303', 'Culpeper', 'c712ca00-13cd-49cb-a760-000000000003', 2),
    ('c712ca00-13cd-49cb-a760-000000000304', 'Fairfax', 'c712ca00-13cd-49cb-a760-000000000003', 3),
    ('c712ca00-13cd-49cb-a760-000000000305', 'Fauquier', 'c712ca00-13cd-49cb-a760-000000000003', 4),
    ('c712ca00-13cd-49cb-a760-000000000306', 'Frederick', 'c712ca00-13cd-49cb-a760-000000000003', 5),
    ('c712ca00-13cd-49cb-a760-000000000307', 'Loudoun', 'c712ca00-13cd-49cb-a760-000000000003', 6),
    ('c712ca00-13cd-49cb-a760-000000000308', 'Prince William', 'c712ca00-13cd-49cb-a760-000000000003', 7),
    ('c712ca00-13cd-49cb-a760-000000000309', 'Rappahannock', 'c712ca00-13cd-49cb-a760-000000000003', 8),
    ('c712ca00-13cd-49cb-a760-000000000310', 'Spotsylvania', 'c712ca00-13cd-49cb-a760-000000000003', 9),
    ('c712ca00-13cd-49cb-a760-000000000311', 'Stafford', 'c712ca00-13cd-49cb-a760-000000000003', 10),
    ('c712ca00-13cd-49cb-a760-000000000312', 'Warren', 'c712ca00-13cd-49cb-a760-000000000003', 11),
    ('c712ca00-13cd-49cb-a760-000000000004', 'Virginia independent cities', NULL, 3),
    ('c712ca00-13cd-49cb-a760-000000000401', 'Alexandria', 'c712ca00-13cd-49cb-a760-000000000004', 0),
    ('c712ca00-13cd-49cb-a760-000000000402', 'Fairfax', 'c712ca00-13cd-49cb-a760-000000000004', 1),
    ('c712ca00-13cd-49cb-a760-000000000403', 'Falls Church', 'c712ca00-13cd-49cb-a760-000000000004', 2),
    ('c712ca00-13cd-49cb-a760-000000000404', 'Fredericksburg', 'c712ca00-13cd-49cb-a760-000000000004', 3),
    ('c712ca00-13cd-49cb-a760-000000000405', 'Manassas', 'c712ca00-13cd-49cb-a760-000000000004', 4),
    ('c712ca00-13cd-49cb-a760-000000000406', 'Manassas Park', 'c712ca00-13cd-49cb-a760-000000000004', 5),
    ('c712ca00-13cd-49cb-a760-000000000005', 'West Virginia counties', NULL, 4),
    ('c712ca00-13cd-49cb-a760-000000000501', 'Jefferson', 'c712ca00-13cd-49cb-a760-000000000005', 0);

UPDATE "project_scanners"
SET "web_address" = 'https://storymaps.arcgis.com/stories/6b5b0cc220c1481fab84024c7bb63a51'
WHERE "id" = 'c712ca00-13cd-49cb-a760-000000000306';
