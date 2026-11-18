import { Box, Stack, Typography } from "@mui/material";
import FindingsTable from "./FindingsTable";
import type { ScannedOpportunity } from "@prisma/client";
import { MuiLinkButton } from "@/components/mui/MuiLinkButton";
import { MuiPageHeader } from "@/components/mui/MuiPageHeader";
import { requireAuthenticated } from "@/lib/authz";
import { prismadb } from "@/lib/prisma";

const dateOnly = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" });

type Finding = Omit<ScannedOpportunity, "runId" | "pullId" | "opportunityKey"> & { pullSource: string | null };

export default async function ScannedOpportunitiesPage() {
  await requireAuthenticated();
  const run = await prismadb.scannerRun.findFirst({
    where: { completedAt: { not: null } },
    orderBy: [{ startedAt: "desc" }, { id: "desc" }],
    select: { id: true, startedAt: true },
  });
  // Keep this query compatible with a Prisma client cached by the running dev server.
  const findings = run ? await prismadb.$queryRaw<Finding[]>`
    SELECT id, title, jurisdiction, scope, status,
           issuing_agency AS "issuingAgency", solicitation_id AS "solicitationId",
           deadline_date AS "deadlineDate", deadline_at AS "deadlineAt",
           deadline_confirmed AS "deadlineConfirmed", planned_funding AS "plannedFunding",
           fiscal_years AS "fiscalYears", official_url AS "officialUrl", change_summary AS "changeSummary",
           (SELECT source FROM pulls WHERE pulls.id = scanned_opportunities.pull_id) AS "pullSource"
    FROM scanned_opportunities
    WHERE run_id = ${run.id}::uuid
    ORDER BY deadline_date ASC NULLS LAST, title, id
  ` : [];
  const scanners = findings.length ? await prismadb.projectScanner.findMany({
    where: { webAddress: { in: Array.from(new Set(findings.flatMap(item => item.pullSource ? [item.pullSource] : []))) } },
    select: { id: true, title: true, webAddress: true, parent: { select: { id: true, title: true } } },
    orderBy: [{ title: "asc" }, { id: "asc" }],
  }) : [];

  return (
    <Box sx={{ px: { xs: 2, md: 3 }, py: 3 }}>
      <MuiPageHeader title="Scanned Opportunities" />
      <Stack spacing={2}>
        <Stack direction="row" spacing={2} sx={{ alignItems: "center", flexWrap: "wrap" }}>
          {run && <Typography>{findings.length} findings · {dateOnly.format(run.startedAt)} scan</Typography>}
          <MuiLinkButton href={run ? `/projects/scanner-pulls?run=${run.id}` : "/projects/scanner-pulls"} variant="outlined">
            View Scanner Pulls
          </MuiLinkButton>
        </Stack>
        {findings.length === 0 ? (
          <Typography color="text.secondary">No findings saved for the latest completed scan.</Typography>
        ) : (
          <FindingsTable findings={findings.map(item => ({
            ...item, deadlineDate: item.deadlineDate?.toISOString() ?? null,
            scannerSources: scanners.filter(scanner => scanner.webAddress === item.pullSource).map(scanner => ({
              id: scanner.id, title: scanner.title, url: scanner.webAddress!,
              parentTitle: scanner.parent?.title ?? null,
            })),
            deadlineAt: item.deadlineAt?.toISOString() ?? null, plannedFunding: item.plannedFunding?.toNumber() ?? null,
          }))} />
        )}
      </Stack>
    </Box>
  );
}
