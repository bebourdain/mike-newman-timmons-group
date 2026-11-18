"use client";

import { useState } from "react";
import { Box, Button, Checkbox, FormControlLabel, Link, MenuItem, Paper, Popover, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel, TextField, Typography } from "@mui/material";
import { ChevronDown } from "lucide-react";
import type { ScannedOpportunity } from "@prisma/client";

export type FindingRow = Omit<ScannedOpportunity, "runId" | "pullId" | "opportunityKey" | "deadlineDate" | "deadlineAt" | "plannedFunding"> & {
  deadlineDate: string | null;
  deadlineAt: string | null;
  plannedFunding: number | null;
  pullSource: string | null;
  scannerSources: { id: string; title: string; url: string; parentTitle: string | null }[];
};
type Sort = "title" | "jurisdiction" | "status" | "deadline" | "plannedFunding";
const dateOnly = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" });
const easternDateTime = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/New_York",
});
const dollars = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });


export default function FindingsTable({ findings }: { findings: FindingRow[] }) {
  const [query, setQuery] = useState("");
  const [selectedJurisdictions, setSelectedJurisdictions] = useState<string[]>(() => Array.from(new Set(findings.map(row => row.jurisdiction))));
  const [filterAnchor, setFilterAnchor] = useState<HTMLElement | null>(null);
  const [jurisdictionSearch, setJurisdictionSearch] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState<Sort>("deadline");
  const [direction, setDirection] = useState<"asc" | "desc">("asc");
  const jurisdictions = Array.from(new Set(findings.map(row => row.jurisdiction))).sort();
  const statuses = Array.from(new Set(findings.map(row => row.status))).sort();
  const matchingJurisdictions = jurisdictions.filter(value => value.toLowerCase().includes(jurisdictionSearch.trim().toLowerCase()));
  const states = Array.from(new Set(jurisdictions.map(value => value.split(" / ")[0]))).sort();
  const allSelected = jurisdictions.every(value => selectedJurisdictions.includes(value));
  function toggleJurisdictions(values: string[]) {
    const selected = values.every(value => selectedJurisdictions.includes(value));
    setSelectedJurisdictions(previous => selected
      ? previous.filter(value => !values.includes(value))
      : Array.from(new Set([...previous, ...values])));
  }
  function changeSort(column: Sort) {
    setDirection(sort === column && direction === "asc" ? "desc" : "asc");
    setSort(column);
  }
  const search = query.trim().toLocaleLowerCase();
  const visible = findings.filter(row =>
    selectedJurisdictions.includes(row.jurisdiction) &&
    (!status || row.status === status) &&
    (!search || [row.title, row.scope, row.solicitationId, row.jurisdiction, row.issuingAgency,
      ...row.scannerSources.flatMap(source => [source.title, source.parentTitle])].some(value => value?.toLocaleLowerCase().includes(search)))
  ).sort((a, b) => {
    const left = sort === "deadline" ? a.deadlineAt ?? a.deadlineDate : a[sort];
    const right = sort === "deadline" ? b.deadlineAt ?? b.deadlineDate : b[sort];
    if (left === null && right !== null) return 1;
    if (right === null && left !== null) return -1;
    const comparison = typeof left === "number" && typeof right === "number"
      ? left - right : String(left ?? "").localeCompare(String(right ?? ""), "en", { numeric: true });
    return comparison * (direction === "asc" ? 1 : -1) || a.title.localeCompare(b.title) || a.id.localeCompare(b.id);
  });
  return <Stack spacing={2}>
    <Stack direction={{ xs: "column", sm: "row" }} useFlexGap spacing={1} sx={{ flexWrap: "wrap", alignItems: { sm: "center" } }}>
      <TextField size="small" label="Search findings" value={query} onChange={event => setQuery(event.target.value)} sx={{ flex: 1, minWidth: 200 }} />
      <TextField size="small" select label="Sort by" value={sort} onChange={event => setSort(event.target.value as Sort)} sx={{ minWidth: 180 }}>
        <MenuItem value="title">Opportunity</MenuItem>
        <MenuItem value="jurisdiction">Jurisdiction</MenuItem>
        <MenuItem value="status">Status</MenuItem>
        <MenuItem value="deadline">Deadline</MenuItem>
        <MenuItem value="plannedFunding">Planned funding</MenuItem>
      </TextField>
      <Button onClick={() => setDirection(value => value === "asc" ? "desc" : "asc")}
        aria-label="Toggle sort direction">{direction === "asc" ? "Ascending" : "Descending"}</Button>
      <Button variant="outlined" endIcon={<ChevronDown size={16} />}
        aria-haspopup="dialog" aria-expanded={!!filterAnchor} aria-controls={filterAnchor ? "jurisdiction-filter" : undefined}
        onClick={event => setFilterAnchor(event.currentTarget)}>
        {allSelected ? "All jurisdictions" : selectedJurisdictions.length === 0 ? "No jurisdictions" : `${selectedJurisdictions.length} jurisdictions`}
      </Button>
      <TextField size="small" select label="Status" value={status} onChange={event => setStatus(event.target.value)} sx={{ minWidth: 200 }}>
        <MenuItem value="">All statuses</MenuItem>
        {statuses.map(value => <MenuItem key={value} value={value}>{value}</MenuItem>)}
      </TextField>
      <Button disabled={!query && allSelected && !status} onClick={() => { setQuery(""); setSelectedJurisdictions(jurisdictions); setStatus(""); setJurisdictionSearch(""); }}>Clear filters</Button>
    </Stack>
    <Popover id="jurisdiction-filter" open={!!filterAnchor} anchorEl={filterAnchor}
      onClose={() => setFilterAnchor(null)} anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      slotProps={{ paper: { sx: { width: 440, maxWidth: "calc(100vw - 32px)", maxHeight: 520, p: 2 } } }}>
      <Stack spacing={1.5} role="dialog" aria-label="Filter jurisdictions">
        <Typography sx={{ fontWeight: 600 }}>Jurisdictions</Typography>
        <TextField size="small" autoFocus fullWidth label="Search jurisdictions" placeholder="Try Virginia or Frederick"
          value={jurisdictionSearch} onChange={event => setJurisdictionSearch(event.target.value)} />
        <Stack direction="row" spacing={1}>
          <Button size="small" disabled={allSelected} onClick={() => setSelectedJurisdictions(jurisdictions)}>Select all</Button>
          <Button size="small" disabled={selectedJurisdictions.length === 0} onClick={() => setSelectedJurisdictions([])}>Deselect all</Button>
        </Stack>
        <Box>
          {states.map(state => {
            const group = jurisdictions.filter(value => value === state || value.startsWith(state + " / "));
            const matching = matchingJurisdictions.filter(value => group.includes(value));
            if (matching.length === 0) return null;
            const selectedCount = group.filter(value => selectedJurisdictions.includes(value)).length;
            return <Box key={state}>
              <FormControlLabel sx={{ display: "flex", m: 0 }} label={state} control={
                <Checkbox size="small" checked={selectedCount === group.length} indeterminate={selectedCount > 0 && selectedCount < group.length}
                  onChange={() => toggleJurisdictions(group)} slotProps={{ input: { "aria-label": "All " + state + " jurisdictions" } }} />
              } />
              {matching.filter(value => value !== state).map(value => (
                <FormControlLabel key={value} sx={{ display: "flex", ml: 2, mr: 0 }}
                  label={<Typography variant="body2">{value.slice(state.length + 3)}</Typography>}
                  control={<Checkbox size="small" checked={selectedJurisdictions.includes(value)}
                    onChange={() => toggleJurisdictions([value])} slotProps={{ input: { "aria-label": value } }} />} />
              ))}
            </Box>;
          })}
          {matchingJurisdictions.length === 0 && <Typography color="text.secondary">No matching jurisdictions.</Typography>}
        </Box>
      </Stack>
    </Popover>
    <Typography variant="body2" color="text.secondary" role="status">{visible.length} of {findings.length} findings</Typography>
    <TableContainer component={Paper} variant="outlined">
            <Table size="small" aria-label="Scanned opportunities">
              <TableHead>
                <TableRow>
                  <TableCell sortDirection={sort === "title" ? direction : false}>
                    <TableSortLabel active={sort === "title"} direction={sort === "title" ? direction : "asc"}
                      onClick={() => changeSort("title")}>Opportunity</TableSortLabel>
                  </TableCell>
                  <TableCell sortDirection={sort === "jurisdiction" ? direction : false}>
                    <TableSortLabel active={sort === "jurisdiction"} direction={sort === "jurisdiction" ? direction : "asc"}
                      onClick={() => changeSort("jurisdiction")}>Jurisdiction and issuer</TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ minWidth: 220 }}>Scanner source / current parent</TableCell>
                  <TableCell sortDirection={sort === "status" ? direction : false}>
                    <TableSortLabel active={sort === "status"} direction={sort === "status" ? direction : "asc"}
                      onClick={() => changeSort("status")}>Status at scan</TableSortLabel>
                  </TableCell>
                  <TableCell sortDirection={sort === "deadline" ? direction : false}>
                    <TableSortLabel active={sort === "deadline"} direction={sort === "deadline" ? direction : "asc"}
                      onClick={() => changeSort("deadline")}>Deadline (Eastern)</TableSortLabel>
                  </TableCell>
                  <TableCell sortDirection={sort === "plannedFunding" ? direction : false}>
                    <TableSortLabel active={sort === "plannedFunding"} direction={sort === "plannedFunding" ? direction : "asc"}
                      onClick={() => changeSort("plannedFunding")}>Planned funding</TableSortLabel>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visible.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell sx={{ minWidth: 260 }}>
                      {item.officialUrl && /^https?:\/\//i.test(item.officialUrl) ? (
                        <Link href={item.officialUrl} target="_blank" rel="noopener noreferrer">{item.title}</Link>
                      ) : item.title}
                      {item.solicitationId && <Typography variant="body2">{item.solicitationId}</Typography>}
                      {item.scope && <Typography variant="body2" color="text.secondary">{item.scope}</Typography>}
                      {item.changeSummary && <Typography variant="body2">{item.changeSummary}</Typography>}
                    </TableCell>
                    <TableCell>
                      {item.jurisdiction}
                      {item.issuingAgency && <Typography variant="body2">{item.issuingAgency}</Typography>}
                    </TableCell>
                    <TableCell sx={{ minWidth: 220 }}>
                      <Stack spacing={1}>
                        {item.scannerSources.map(source => <Box key={source.id}>
                          <Link href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</Link>
                          <Typography variant="body2" color="text.secondary">Current parent: {source.parentTitle ?? "Top level"}</Typography>
                        </Box>)}
                        {item.scannerSources.length > 1 && <Typography variant="caption" color="text.secondary">Shared pull URL · multiple scanner records</Typography>}
                        {item.scannerSources.length === 0 && <>
                          <Typography variant="body2" color="text.secondary">No current scanner match</Typography>
                          {item.pullSource && <Link href={item.pullSource} target="_blank" rel="noopener noreferrer" sx={{ overflowWrap: "anywhere" }}>{item.pullSource}</Link>}
                        </>}
                      </Stack>
                    </TableCell>
                    <TableCell>{item.status}</TableCell>
                    <TableCell>
                      {item.deadlineAt ? easternDateTime.format(new Date(item.deadlineAt)) : item.deadlineDate ? dateOnly.format(new Date(item.deadlineDate)) : "—"}
                      {!item.deadlineConfirmed && (item.deadlineAt || item.deadlineDate) && (
                        <Typography variant="body2" color="text.secondary">Unconfirmed</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.plannedFunding !== null ? dollars.format(item.plannedFunding) : "—"}
                      {item.fiscalYears.length > 0 && (
                        <Typography variant="body2">{item.fiscalYears.map(year => `FY${year}`).join(", ")}</Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
    {visible.length === 0 && <Typography>No findings match these filters.</Typography>}
  </Stack>;
}
