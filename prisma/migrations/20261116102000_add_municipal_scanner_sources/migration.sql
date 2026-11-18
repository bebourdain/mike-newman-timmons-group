BEGIN;

SELECT pg_advisory_xact_lock(184721, 1);

ALTER TABLE "project_scanners" DROP CONSTRAINT "project_scanners_level_check";
ALTER TABLE "project_scanners" ADD CONSTRAINT "project_scanners_level_check"
    CHECK ("level" IN ('state', 'county', 'city', 'town'));

WITH sources(id, parent_id, title, level, web_address, notes, ordinal) AS (
    VALUES
    ('c712ca00-13cd-49cb-a760-000000100300'::uuid, 'c712ca00-13cd-49cb-a760-000000000003'::uuid, 'Winchester', 'city', 'https://www.winchesterva.gov/Government/Departments/Purchasing', 'Independent city.', 1),
    ('c712ca00-13cd-49cb-a760-000000120100'::uuid, 'c712ca00-13cd-49cb-a760-000000000201'::uuid, 'Annapolis', 'city', 'https://www.annapolis.gov/bids.aspx', NULL, 1),
    ('c712ca00-13cd-49cb-a760-000000120200'::uuid, 'c712ca00-13cd-49cb-a760-000000000202'::uuid, 'Chesapeake Beach', 'town', 'https://www.chesapeakebeachmd.gov/221/Request-for-Proposals-RFPs', NULL, 1),
    ('c712ca00-13cd-49cb-a760-000000120300'::uuid, 'c712ca00-13cd-49cb-a760-000000000203'::uuid, 'La Plata', 'town', 'https://www.townoflaplata.org/Bids.aspx', NULL, 1),
    ('c712ca00-13cd-49cb-a760-000000120400'::uuid, 'c712ca00-13cd-49cb-a760-000000000204'::uuid, 'Brunswick', 'city', 'https://brunswickmd.gov/newsandannouncements', NULL, 1),
    ('c712ca00-13cd-49cb-a760-000000120401'::uuid, 'c712ca00-13cd-49cb-a760-000000000204'::uuid, 'Frederick', 'city', 'https://www.cityoffrederickmd.gov/1752/Purchasing-Opportunities', NULL, 2),
    ('c712ca00-13cd-49cb-a760-000000120402'::uuid, 'c712ca00-13cd-49cb-a760-000000000204'::uuid, 'Mount Airy', 'town', 'https://www.mountairymd.gov/Bids.aspx', 'Mount Airy spans Frederick and Carroll counties.', 3),
    ('c712ca00-13cd-49cb-a760-000000120600'::uuid, 'c712ca00-13cd-49cb-a760-000000000206'::uuid, 'Gaithersburg', 'city', 'https://www.gaithersburgmd.gov/government/procurement', NULL, 1),
    ('c712ca00-13cd-49cb-a760-000000120601'::uuid, 'c712ca00-13cd-49cb-a760-000000000206'::uuid, 'Rockville', 'city', 'https://contracts.rockvillemd.gov/gateway/solicitationsearch', NULL, 2),
    ('c712ca00-13cd-49cb-a760-000000120602'::uuid, 'c712ca00-13cd-49cb-a760-000000000206'::uuid, 'Takoma Park', 'city', 'https://www.publicpurchase.com/gems/buyer/public/home?region=MD&syndicatedOrgId=28508', NULL, 3),
    ('c712ca00-13cd-49cb-a760-000000120700'::uuid, 'c712ca00-13cd-49cb-a760-000000000207'::uuid, 'Bowie', 'city', 'https://www.cityofbowie.org/Bids.aspx', NULL, 1),
    ('c712ca00-13cd-49cb-a760-000000120701'::uuid, 'c712ca00-13cd-49cb-a760-000000000207'::uuid, 'College Park', 'city', 'https://www.collegeparkmd.gov/bids.aspx', NULL, 2),
    ('c712ca00-13cd-49cb-a760-000000120702'::uuid, 'c712ca00-13cd-49cb-a760-000000000207'::uuid, 'Greenbelt', 'city', 'https://www.greenbeltmd.gov/Bids.aspx', NULL, 3),
    ('c712ca00-13cd-49cb-a760-000000120703'::uuid, 'c712ca00-13cd-49cb-a760-000000000207'::uuid, 'Hyattsville', 'city', 'https://hyattsville.org/rfp', NULL, 4),
    ('c712ca00-13cd-49cb-a760-000000120704'::uuid, 'c712ca00-13cd-49cb-a760-000000000207'::uuid, 'Laurel', 'city', 'https://www.laurelmd.gov/184/Projects-for-Bid', NULL, 5),
    ('c712ca00-13cd-49cb-a760-000000120800'::uuid, 'c712ca00-13cd-49cb-a760-000000000208'::uuid, 'Leonardtown', 'town', 'https://leonardtown.somd.com/government/RequestForProposal.htm', NULL, 1),
    ('c712ca00-13cd-49cb-a760-000000130200'::uuid, 'c712ca00-13cd-49cb-a760-000000000302'::uuid, 'Berryville', 'town', 'https://www.berryvilleva.gov/2211/Bid-Procurement-Opportunities', NULL, 1),
    ('c712ca00-13cd-49cb-a760-000000130400'::uuid, 'c712ca00-13cd-49cb-a760-000000000304'::uuid, 'Herndon', 'town', 'https://www.herndon-va.gov/departments/finance/purchasing', NULL, 1),
    ('c712ca00-13cd-49cb-a760-000000130401'::uuid, 'c712ca00-13cd-49cb-a760-000000000304'::uuid, 'Vienna', 'town', 'https://www.viennava.gov/Town-Departments/Finance/Purchasing', NULL, 2),
    ('c712ca00-13cd-49cb-a760-000000130500'::uuid, 'c712ca00-13cd-49cb-a760-000000000305'::uuid, 'Warrenton', 'town', 'https://www.warrentonva.gov/488/Bids-Proposals', NULL, 1),
    ('c712ca00-13cd-49cb-a760-000000130700'::uuid, 'c712ca00-13cd-49cb-a760-000000000307'::uuid, 'Leesburg', 'town', 'https://www.leesburgva.gov/departments/finance/procurement/how-to-do-business-with-the-town', NULL, 1),
    ('c712ca00-13cd-49cb-a760-000000130701'::uuid, 'c712ca00-13cd-49cb-a760-000000000307'::uuid, 'Middleburg', 'town', 'https://www.middleburgva.gov/bids.aspx', NULL, 2),
    ('c712ca00-13cd-49cb-a760-000000130702'::uuid, 'c712ca00-13cd-49cb-a760-000000000307'::uuid, 'Purcellville', 'town', 'https://www.purcellvilleva.gov/Bids.aspx', NULL, 3),
    ('c712ca00-13cd-49cb-a760-000000130703'::uuid, 'c712ca00-13cd-49cb-a760-000000000307'::uuid, 'Round Hill', 'town', 'https://www.roundhillva.gov/1412/Bid-and-Contract-Opportunities', NULL, 4),
    ('c712ca00-13cd-49cb-a760-000000130800'::uuid, 'c712ca00-13cd-49cb-a760-000000000308'::uuid, 'Haymarket', 'town', 'https://www.townofhaymarket.org/m/newsflash/home', NULL, 1),
    ('c712ca00-13cd-49cb-a760-000000131200'::uuid, 'c712ca00-13cd-49cb-a760-000000000312'::uuid, 'Front Royal', 'town', 'https://www.frontroyalva.com/367/Purchasing', NULL, 1),
    ('c712ca00-13cd-49cb-a760-000000150100'::uuid, 'c712ca00-13cd-49cb-a760-000000000501'::uuid, 'Shepherdstown', 'town', 'https://www.shepherdstown.gov/bidsandrequestsforproposals-qualifications', NULL, 1)
)
INSERT INTO "project_scanners" ("id", "parent_id", "title", "level", "web_address", "notes", "position")
SELECT sources.id, parent.id, sources.title, sources.level, sources.web_address, sources.notes,
       COALESCE((SELECT max(child."position") FROM "project_scanners" child WHERE child."parent_id" = parent.id), -1)
       + sources.ordinal
FROM sources
JOIN "project_scanners" parent ON parent.id = sources.parent_id
WHERE NOT EXISTS (
    SELECT 1 FROM "project_scanners" child
    WHERE child."parent_id" = parent.id AND lower(child."title") = lower(sources.title)
)
ON CONFLICT ("id") DO NOTHING;

COMMIT;
