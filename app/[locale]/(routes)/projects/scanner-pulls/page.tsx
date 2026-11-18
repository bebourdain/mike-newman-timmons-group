import NextLink from "next/link";
import {
  Box, Chip, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography,
} from "@mui/material";
import { MuiPageHeader } from "@/components/mui/MuiPageHeader";
import { requireAuthenticated } from "@/lib/authz";
import { prismadb } from "@/lib/prisma";

const pageSize = 20;

export default async function ScannerPullsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; run?: string; runPage?: string }>;
}) {
  await requireAuthenticated();
  const { page, run, runPage } = await searchParams;
  const requestedPage = Number(page);
  const requestedRunPage = Number(runPage);
  const runCount = await prismadb.scannerRun.count();
  const lastRunPage = Math.max(1, Math.ceil(runCount / pageSize));
  const currentRunPage = Number.isSafeInteger(requestedRunPage)
    ? Math.min(Math.max(requestedRunPage, 1), lastRunPage)
    : 1;
  const runs = await prismadb.scannerRun.findMany({
    orderBy: [{ startedAt: "desc" }, { id: "desc" }],
    skip: (currentRunPage - 1) * pageSize,
    take: pageSize,
    include: { _count: { select: { pulls: true } } },
  });
  const selectedRun = run === "unassigned"
    ? undefined
    : runs.find((item) => item.id === run) ?? runs[0];
  const where = { runId: selectedRun?.id ?? null };
  const count = await prismadb.pull.count({ where });
  const statusCounts = await prismadb.pull.groupBy({ by: ["status"], where, _count: { _all: true } });
  const pullQuery = { run: selectedRun?.id ?? "unassigned", runPage: currentRunPage };
  const lastPage = Math.max(1, Math.ceil(count / pageSize));
  const currentPage = Number.isSafeInteger(requestedPage)
    ? Math.min(Math.max(requestedPage, 1), lastPage)
    : 1;
  const pulls = await prismadb.pull.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (currentPage - 1) * pageSize,
    take: pageSize,
  });

  return (
    <Box sx={{ px: { xs: 2, md: 3 }, py: 3 }}>
      <MuiPageHeader title="Scanner Pulls" />
      {runCount > 0 && (
        <Stack spacing={1} sx={{ mb: 2 }}>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small" aria-label="Scanner runs">
              <TableHead>
                <TableRow>
                  <TableCell>Run ID</TableCell>
                  <TableCell>Started (UTC)</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Pulls</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {runs.map((item) => (
                  <TableRow key={item.id} selected={selectedRun?.id === item.id}>
                    <TableCell>
                      <NextLink href={{ query: { run: item.id, runPage: currentRunPage } }}
                        aria-current={selectedRun?.id === item.id ? "page" : undefined}>
                        {item.id}
                      </NextLink>
                    </TableCell>
                    <TableCell>{item.startedAt.toISOString()}</TableCell>
                    <TableCell>{item.completedAt ? "Completed" : "Unfinished"}</TableCell>
                    <TableCell align="right">{item._count.pulls}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Stack direction="row" spacing={2}>
            {currentRunPage > 1 && <NextLink href={{ query: { runPage: currentRunPage - 1 } }}>Newer runs</NextLink>}
            {currentRunPage < lastRunPage && <NextLink href={{ query: { runPage: currentRunPage + 1 } }}>Older runs</NextLink>}
            <NextLink href={{ query: { run: "unassigned", runPage: currentRunPage } }}>Pulls without a run</NextLink>
          </Stack>
          <Typography variant="h6" component="h2">
            {selectedRun ? "Pulls for run " + selectedRun.id : "Pulls without a run"}
          </Typography>
        </Stack>
      )}
      <Stack direction="row" useFlexGap spacing={1} sx={{ mb: 2, flexWrap: "wrap" }}>
        {statusCounts.map(({ status, _count }) => <Chip key={status} size="small" label={`${_count._all} ${status.toLowerCase()}`}
          color={status === "Failed" ? "error" : status === "Partial" ? "warning" : status === "Success" ? "success" : "default"} />)}
      </Stack>
      {pulls.length === 0 ? (
        <Typography color="text.secondary">{selectedRun ? "No pulls have been saved for this run yet." : "No scanner pulls have been saved here yet."}</Typography>
      ) : (
        <Stack spacing={2}>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small" aria-label="Scanner pulls">
              <TableHead>
                <TableRow>
                  <TableCell>Source</TableCell>
                  <TableCell>Saved at (UTC)</TableCell>
                  <TableCell>Retrieval status</TableCell>
                  <TableCell>Failure reason</TableCell>
                  <TableCell>Raw data</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pulls.map(({ id, source, createdAt, data, status, failureReason }) => (
                  <TableRow key={id}>
                    <TableCell sx={{ overflowWrap: "anywhere" }}>{source}</TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>{createdAt.toISOString()}</TableCell>
                    <TableCell><Chip size="small" label={status ?? "Unverified"}
                      color={status === "Failed" ? "error" : status === "Partial" ? "warning" : status === "Success" ? "success" : "default"} /></TableCell>
                    <TableCell sx={{ minWidth: 220, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{failureReason ?? "—"}</TableCell>
                    <TableCell>
                      <details>
                        <summary>View JSON</summary>
                        <Box component="pre" sx={{ maxHeight: 320, overflow: "auto", whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                          {JSON.stringify(data, null, 2)}
                        </Box>
                      </details>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {lastPage > 1 && (
            <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
              {currentPage > 1 && <NextLink href={{ query: { ...pullQuery, page: currentPage - 1 } }}>Previous</NextLink>}
              <Typography variant="body2">Page {currentPage} of {lastPage}</Typography>
              {currentPage < lastPage && <NextLink href={{ query: { ...pullQuery, page: currentPage + 1 } }}>Next</NextLink>}
            </Stack>
          )}
        </Stack>
      )}
    </Box>
  );
}
