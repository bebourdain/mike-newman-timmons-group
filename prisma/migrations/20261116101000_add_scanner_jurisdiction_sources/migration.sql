BEGIN;

ALTER TABLE "project_scanners" ADD COLUMN "level" TEXT;
ALTER TABLE "project_scanners" ADD CONSTRAINT "project_scanners_level_check"
    CHECK ("level" IN ('state', 'county', 'city'));

UPDATE "project_scanners" AS scanner
SET "level" = source.level,
    "title" = COALESCE(source.title, scanner."title"),
    "web_address" = COALESCE(scanner."web_address", source.url),
    "notes" = COALESCE(scanner."notes", source.notes)
FROM (VALUES
    ('c712ca00-13cd-49cb-a760-000000000001'::uuid, 'state', 'District of Columbia', 'https://contracts.ocp.dc.gov/', NULL),
    ('c712ca00-13cd-49cb-a760-000000000002'::uuid, 'state', 'Maryland', 'https://emma.maryland.gov/', NULL),
    ('c712ca00-13cd-49cb-a760-000000000003'::uuid, 'state', 'Virginia', 'https://eva.virginia.gov/', NULL),
    ('c712ca00-13cd-49cb-a760-000000000005'::uuid, 'state', 'West Virginia', 'https://www.state.wv.us/admin/purchase/PURBUL.HTM', NULL),
    ('c712ca00-13cd-49cb-a760-000000000201'::uuid, 'county', NULL, 'https://www.aacounty.org/central-services/purchasing/doing-business-county', NULL),
    ('c712ca00-13cd-49cb-a760-000000000202'::uuid, 'county', NULL, 'https://www.calvertcountymd.gov/257/Solicitations-and-Vendor-Registration', NULL),
    ('c712ca00-13cd-49cb-a760-000000000203'::uuid, 'county', NULL, 'https://www.charlescountymd.gov/business/procurement-bid-opportunities/bid-board-eprocurement', NULL),
    ('c712ca00-13cd-49cb-a760-000000000204'::uuid, 'county', NULL, 'https://frederickcountymd.gov/1116/Current-Awarded-Solicitations', NULL),
    ('c712ca00-13cd-49cb-a760-000000000205'::uuid, 'county', NULL, 'https://www.howardcountymd.gov/procurement-contract-administration/current-solicitations', NULL),
    ('c712ca00-13cd-49cb-a760-000000000206'::uuid, 'county', NULL, 'https://apps.montgomerycountymd.gov/prosolicitation/SolicitationsAndBids.aspx?type=Open', NULL),
    ('c712ca00-13cd-49cb-a760-000000000207'::uuid, 'county', NULL, 'https://www.princegeorgescountymd.gov/departments-offices/procurement', NULL),
    ('c712ca00-13cd-49cb-a760-000000000208'::uuid, 'county', NULL, 'https://www.stmaryscountymd.gov/Procurement/', NULL),
    ('c712ca00-13cd-49cb-a760-000000000301'::uuid, 'county', NULL, 'https://www.arlingtonva.us/Government/Programs/Budget-Finance/Purchasing', NULL),
    ('c712ca00-13cd-49cb-a760-000000000302'::uuid, 'county', NULL, 'https://www.clarkecounty.gov/business/procurement-notifications-bids-rfps/-sortn-RFPStatus/-sortd-asc', NULL),
    ('c712ca00-13cd-49cb-a760-000000000303'::uuid, 'county', NULL, 'https://eva.virginia.gov/', 'Filter Virginia Business Opportunities by Culpeper County. Dedicated county listing still needs verification.'),
    ('c712ca00-13cd-49cb-a760-000000000304'::uuid, 'county', NULL, 'https://www.fairfaxcounty.gov/solicitation/', NULL),
    ('c712ca00-13cd-49cb-a760-000000000305'::uuid, 'county', NULL, 'https://www.fauquiercounty.gov/government/departments-h-z/procurement/bids-proposals', NULL),
    ('c712ca00-13cd-49cb-a760-000000000306'::uuid, 'county', NULL, 'https://storymaps.arcgis.com/stories/6b5b0cc220c1481fab84024c7bb63a51', 'County bids and RFPs: https://www.fcva.us/departments/finance/purchasing/bids-rfps'),
    ('c712ca00-13cd-49cb-a760-000000000307'::uuid, 'county', NULL, 'https://va-loudouncounty.civicplus.com/929/Current-Solicitations', NULL),
    ('c712ca00-13cd-49cb-a760-000000000308'::uuid, 'county', NULL, 'https://eservice2.pwcgov.org/eservices/procurement/default', NULL),
    ('c712ca00-13cd-49cb-a760-000000000309'::uuid, 'county', NULL, 'https://eva.virginia.gov/', 'Filter Virginia Business Opportunities by Rappahannock County. Dedicated county listing still needs verification.'),
    ('c712ca00-13cd-49cb-a760-000000000310'::uuid, 'county', NULL, 'https://www.spotsylvania.va.us/Bids.aspx', NULL),
    ('c712ca00-13cd-49cb-a760-000000000311'::uuid, 'county', NULL, 'https://www.publicpurchase.com/gems/co.stafford%2Cva/buyer/public/home', NULL),
    ('c712ca00-13cd-49cb-a760-000000000312'::uuid, 'county', NULL, 'https://warrencountyva.gov/185/Procurement', NULL),
    ('c712ca00-13cd-49cb-a760-000000000501'::uuid, 'county', NULL, 'https://www.jeffersoncountywv.org/county-government/bids-rfps', NULL),
    ('c712ca00-13cd-49cb-a760-000000000101'::uuid, 'city', NULL, 'https://dgs.dc.gov/am/page/active-solicitations', NULL),
    ('c712ca00-13cd-49cb-a760-000000000401'::uuid, 'city', NULL, 'https://www.alexandriava.gov/finance/city-of-alexandrias-solicitation-portal', NULL),
    ('c712ca00-13cd-49cb-a760-000000000402'::uuid, 'city', NULL, 'https://www.fairfaxva.gov/Property-Business/Business-with-the-City/Procurement', NULL),
    ('c712ca00-13cd-49cb-a760-000000000403'::uuid, 'city', NULL, 'https://choosefallschurch.org/713/Purchasing-Bids-Solicitations', NULL),
    ('c712ca00-13cd-49cb-a760-000000000404'::uuid, 'city', NULL, 'https://va-fredericksburg.civicplus.com/711/Procurement', NULL),
    ('c712ca00-13cd-49cb-a760-000000000405'::uuid, 'city', NULL, 'https://eva.virginia.gov/', 'Filter Virginia Business Opportunities by City of Manassas. Dedicated city listing still needs verification.'),
    ('c712ca00-13cd-49cb-a760-000000000406'::uuid, 'city', NULL, 'https://www.manassasparkva.gov/o/cmp/page/city-purchasing-procurement', NULL)
) AS source(id, level, title, url, notes)
WHERE scanner."id" = source.id;

WITH city_order AS (
    SELECT "id", row_number() OVER (ORDER BY "position", "id") AS ordinal
    FROM "project_scanners"
    WHERE "parent_id" = 'c712ca00-13cd-49cb-a760-000000000004' AND "id" <> 'c712ca00-13cd-49cb-a760-000000000003'
), county_order AS (
    SELECT COALESCE(max("position"), -1) AS last_position
    FROM "project_scanners"
    WHERE "parent_id" = 'c712ca00-13cd-49cb-a760-000000000003'
)
UPDATE "project_scanners" AS city
SET "parent_id" = 'c712ca00-13cd-49cb-a760-000000000003', "position" = county_order.last_position + city_order.ordinal
FROM city_order CROSS JOIN county_order
WHERE city."id" = city_order."id";

DELETE FROM "project_scanners"
WHERE "id" = 'c712ca00-13cd-49cb-a760-000000000004'
  AND "title" = 'Virginia independent cities'
  AND "web_address" IS NULL AND "notes" IS NULL AND NOT EXISTS (SELECT 1 FROM "project_scanners" WHERE "parent_id" = 'c712ca00-13cd-49cb-a760-000000000004');

COMMIT;
