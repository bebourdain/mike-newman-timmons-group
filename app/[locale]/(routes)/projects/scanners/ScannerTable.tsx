"use client";

import { useState } from "react";
import {
  Alert, Box, Button, Checkbox, Chip, FormControlLabel, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, Menu, MenuItem, Paper, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import { CheckCircle2, ChevronDown, ChevronRight, Info, MoreHorizontal } from "lucide-react";
import type { ProjectScanner } from "@prisma/client";
import { moveScanner, saveScanner } from "./actions";
import { codexScannerInstructions } from "./codex-scanner-prompt";

const levels = { state: "State", county: "County", city: "City", town: "Town" } as const;

type Editor =
  | { kind: "details"; scanner: ProjectScanner | null }
  | { kind: "parent"; scanner: ProjectScanner };

export default function ScannerTable({ scanners }: { scanners: ProjectScanner[] }) {
  const [codexPrompt, setCodexPrompt] = useState<string | null>(null);
  const [promptJurisdiction, setPromptJurisdiction] = useState("All jurisdictions");
  const [copyStatus, setCopyStatus] = useState("");
  const [editor, setEditor] = useState<Editor | null>(null);
  const [busy, setBusy] = useState(false);
  const [notesScanner, setNotesScanner] = useState<ProjectScanner | null>(null);
  const [failureDialog, setFailureDialog] = useState<{ title: string; sources: ProjectScanner[] } | null>(null);
  const [actionMenu, setActionMenu] = useState<{ anchor: HTMLElement; scanner: ProjectScanner; index: number; count: number } | null>(null);
  const [expandedBranches, setExpandedBranches] = useState(() => new Set<string>());

  function toggleBranch(id: string) {
    setExpandedBranches((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const [error, setError] = useState<string>();
  const children = new Map<string | null, ProjectScanner[]>();
  for (const scanner of scanners) {
    const siblings = children.get(scanner.parentId) ?? [];
    siblings.push(scanner);
    children.set(scanner.parentId, siblings);
  }

  const rows: { scanner: ProjectScanner; depth: number; index: number; count: number; path: string; ancestors: string[] }[] = [];
  function visit(parentId: string | null, ancestors: string[], parentPath: string) {
    const siblings = children.get(parentId) ?? [];
    siblings.forEach((scanner, index) => {
      const path = parentPath ? parentPath + " / " + scanner.title : scanner.title;
      rows.push({ scanner, depth: ancestors.length, index, count: siblings.length, path, ancestors });
      visit(scanner.id, [...ancestors, scanner.id], path);
    });
  }
  visit(null, [], "");

  // Derive ancestor badges from source flags so resolving or moving a source
  // immediately updates every parent, including collapsed branches.
  const failuresByBranch = new Map<string, ProjectScanner[]>();
  for (const row of rows.filter(({ scanner }) => scanner.knownFailures)) {
    for (const id of [row.scanner.id, ...row.ancestors]) {
      const failures = failuresByBranch.get(id) ?? [];
      failures.push(row.scanner);
      failuresByBranch.set(id, failures);
    }
  }

  function openCodexPrompt(branchId?: string) {
    setPromptJurisdiction(branchId
      ? rows.find(row => row.scanner.id === branchId)?.path ?? "All jurisdictions"
      : "All jurisdictions");
    const selectedRows = branchId
      ? rows.filter(({ scanner, ancestors }) => scanner.id === branchId || ancestors.includes(branchId))
      : rows;
    const sources = selectedRows.flatMap(({ scanner, path }) =>
      scanner.webAddress ? [{
        jurisdiction: path,
        url: scanner.webAddress,
        instructions: scanner.notes ?? "",
        knownFailures: scanner.knownFailures,
        failureNotes: scanner.failureNotes ?? "",
      }] : [],
    );
    setCopyStatus("");
    setCodexPrompt([codexScannerInstructions, "", JSON.stringify(sources, null, 2)].join("\n"));
  }

  async function copyCodexPrompt() {
    if (codexPrompt === null) return;
    try {
      await navigator.clipboard.writeText(codexPrompt);
      setCopyStatus("Prompt copied. Paste it into Codex.");
    } catch {
      setCopyStatus("Select the prompt and copy it manually.");
    }
  }

  async function submit(action: () => Promise<{ error?: string }>) {
    setBusy(true);
    setError(undefined);
    try {
      const result = await action();
      if (result.error) setError(result.error);
      else setEditor(null);
    } catch {
      setError("Could not save the change. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const open = (next: Editor) => {
    setError(undefined);
    setEditor(next);
  };

  return (
    <Stack spacing={2} sx={{ minWidth: 0 }}>
      <Stack direction="row" useFlexGap spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
        <Button size="small" variant="outlined" onClick={() => open({ kind: "details", scanner: null })}>
          Add scanner
        </Button>
        <Button size="small" variant="contained" onClick={() => openCodexPrompt()}
          disabled={!scanners.some((scanner) => scanner.webAddress)}>
          Open Prompt for All
        </Button>
      </Stack>
      {error && !editor && <Alert severity="error">{error}</Alert>}
      <TableContainer component={Paper} variant="outlined" sx={{ overflowX: "auto" }}>
        <Table size="small" aria-label="Project scanners" sx={{ minWidth: 1120, tableLayout: "fixed", "& .MuiTableCell-root": { px: 2, py: 1.5, verticalAlign: "top" } }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 300 }}>Jurisdiction / source</TableCell>
              <TableCell sx={{ width: 330 }}>Instructions</TableCell>
              <TableCell sx={{ width: 310 }}>Failure notes</TableCell>
              <TableCell align="right" sx={{ width: 180 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.filter(({ ancestors }) => ancestors.every((id) => expandedBranches.has(id)))
              .map(({ scanner, depth, index, count }) => {
                const childCount = children.get(scanner.id)?.length ?? 0;
                const expanded = expandedBranches.has(scanner.id);
                const failures = failuresByBranch.get(scanner.id) ?? [];
                const goCount = childCount > 0
                  ? (children.get(scanner.id) ?? []).filter(child => !failuresByBranch.has(child.id)).length
                  : scanner.webAddress && !scanner.knownFailures ? 1 : 0;

                return (
                  <TableRow key={scanner.id} hover>
                    <TableCell component="th" scope="row">
                      <Stack direction="row" spacing={0.75} sx={{ alignItems: "flex-start", pl: Math.min(depth, 4) * 1 }}>
                      {childCount > 0 ? (
                        <IconButton
                          size="small"
                          title={expanded ? "Collapse children" : "Expand children"}
                          aria-label={(expanded ? "Collapse " : "Expand ") + scanner.title}
                          aria-expanded={expanded}
                          onClick={() => toggleBranch(scanner.id)}
                        >
                          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </IconButton>
                      ) : <Box sx={{ width: 30, flexShrink: 0 }} />}
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: depth === 0 ? 600 : 400, wordBreak: "normal", overflowWrap: "break-word" }}>{scanner.title}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {levels[scanner.level as keyof typeof levels] ?? "Source"}
                            {childCount > 0 ? ` · ${childCount} ${childCount === 1 ? "child" : "children"}` : ""}
                          </Typography>
                          <Stack direction="row" useFlexGap spacing={0.75} sx={{ mt: 0.5, flexWrap: "wrap" }}>
                          {failures.length > 0 && <Chip size="small" color="error" variant="outlined"
                              icon={<Info size={14} aria-hidden="true" />}
                              onClick={() => setFailureDialog({ title: scanner.title, sources: failures })}
                              aria-label={`Show known failures for ${scanner.title}`}
                              label={scanner.knownFailures && failures.length === 1 ? "Known failure" : `${failures.length} known failure${failures.length === 1 ? "" : "s"}`}
                              sx={{ width: "fit-content" }} />}
                          {goCount > 0 && <Chip size="small" color="success" variant="outlined"
                            icon={<CheckCircle2 size={14} aria-hidden="true" />}
                            label={`${goCount} Good to Go`}
                            aria-label={`${goCount} ${childCount > 0 ? "child records" : "source"} with no known failures for ${scanner.title}`}
                            sx={{ width: "fit-content" }} />}
                          </Stack>
                          {scanner.webAddress && <Box component="a" href={scanner.webAddress} target="_blank" rel="noreferrer"
                            title={scanner.webAddress} sx={{ display: "block", fontSize: 12, mt: 0.5,
                              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "primary.main" }}>
                            {URL.canParse(scanner.webAddress) ? new URL(scanner.webAddress).hostname.replace(/^www\./, "") : scanner.webAddress}
                          </Box>}
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      {scanner.notes && <Typography variant="body2" sx={{
                        display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
                        whiteSpace: "pre-wrap", overflowWrap: "anywhere",
                      }}>{scanner.notes}</Typography>}
                      {scanner.webAddress && <Stack direction="row" spacing={1}>
                        {scanner.notes && <Button size="small" onClick={() => setNotesScanner(scanner)}
                          aria-label={"View instructions for " + scanner.title}>Read all</Button>}
                        <Button size="small" onClick={() => open({ kind: "details", scanner })}
                          aria-label={"Edit instructions for " + scanner.title}>{scanner.notes ? "Edit" : "Add instructions"}</Button>
                      </Stack>}
                    </TableCell>
                    <TableCell>
                      {scanner.failureNotes ? <>
                        <Typography variant="body2" color="error.main" sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{scanner.failureNotes}</Typography>
                        <Button size="small" onClick={() => setNotesScanner(scanner)}>Read failure notes</Button>
                      </> : failures.length > 0 ? <Typography variant="body2" color="error.main">{failures.length} affected source{failures.length === 1 ? "" : "s"} below</Typography> : <Typography variant="body2" color="text.secondary">—</Typography>}
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                      <Button
                        size="small"
                        disabled={!rows.some(row => (row.scanner.id === scanner.id || row.ancestors.includes(scanner.id)) && row.scanner.webAddress)}
                        aria-label={"Run Scanners for " + scanner.title}
                        onClick={() => openCodexPrompt(scanner.id)}
                      >
                        Open Prompt
                      </Button>
                      <IconButton size="small" aria-label={"Actions for " + scanner.title}
                        aria-haspopup="menu" disabled={busy}
                        onClick={event => setActionMenu({ anchor: event.currentTarget, scanner, index, count })}>
                        <MoreHorizontal size={18} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </TableContainer>
      <Menu anchorEl={actionMenu?.anchor} open={!!actionMenu} onClose={() => setActionMenu(null)}>
        <MenuItem onClick={() => { if (actionMenu) open({ kind: "details", scanner: actionMenu.scanner }); setActionMenu(null); }}>Edit scanner</MenuItem>
        <MenuItem onClick={() => { if (actionMenu) open({ kind: "parent", scanner: actionMenu.scanner }); setActionMenu(null); }}>Change parent</MenuItem>
        <MenuItem disabled={actionMenu?.index === 0} onClick={() => {
          if (actionMenu) void submit(() => moveScanner(actionMenu.scanner.id, { kind: "up" }));
          setActionMenu(null);
        }}>Move up</MenuItem>
        <MenuItem disabled={!!actionMenu && actionMenu.index === actionMenu.count - 1} onClick={() => {
          if (actionMenu) void submit(() => moveScanner(actionMenu.scanner.id, { kind: "down" }));
          setActionMenu(null);
        }}>Move down</MenuItem>
      </Menu>
      {failureDialog && (
        <Dialog open onClose={() => setFailureDialog(null)} fullWidth maxWidth="sm" aria-labelledby="known-failures-title">
          <DialogTitle id="known-failures-title">Known failures · {failureDialog.title}</DialogTitle>
          <DialogContent>
            <Stack spacing={2}>
              {failureDialog.sources.map(source => <Box key={source.id}>
                <Typography variant="subtitle2">{source.title}</Typography>
                {source.webAddress && <Typography component="a" href={source.webAddress} target="_blank" rel="noreferrer" variant="body2" sx={{ overflowWrap: "anywhere" }}>{source.webAddress}</Typography>}
                <Typography variant="body2" sx={{ mt: 1, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{source.failureNotes || "This source is flagged with a known failure. No failure details have been recorded yet."}</Typography>
              </Box>)}
            </Stack>
          </DialogContent>
          <DialogActions><Button onClick={() => setFailureDialog(null)}>Close</Button></DialogActions>
        </Dialog>
      )}
      {notesScanner && (
        <Dialog open onClose={() => setNotesScanner(null)} fullWidth maxWidth="sm">
          <DialogTitle>Instructions · {notesScanner.title}</DialogTitle>
          <DialogContent>
            {notesScanner.failureNotes && <Alert severity="warning" sx={{ mb: 2, whiteSpace: "pre-wrap" }}><strong>Failure notes</strong>{"\n"}{notesScanner.failureNotes}</Alert>}
            <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{notesScanner.notes}</Typography>
          </DialogContent>
          <DialogActions><Button onClick={() => setNotesScanner(null)}>Close</Button></DialogActions>
        </Dialog>
      )}
      {codexPrompt !== null && (
        <Dialog open onClose={() => setCodexPrompt(null)} fullWidth maxWidth="md" aria-labelledby="codex-prompt-title">
          <DialogTitle id="codex-prompt-title">
            Jurisdiction · <Box component="strong">{promptJurisdiction}</Box>
          </DialogTitle>
          <DialogContent>
            <TextField
              label="Codex prompt"
              value={codexPrompt}
              fullWidth
              multiline
              minRows={6}
              maxRows={18}
              slotProps={{ input: { readOnly: true } }}
              sx={{ mt: 1 }}
            />
            {copyStatus && <Typography role="status" variant="body2" sx={{ mt: 1 }}>{copyStatus}</Typography>}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCodexPrompt(null)}>Close</Button>
            <Button onClick={copyCodexPrompt} variant="contained">Copy prompt</Button>
          </DialogActions>
        </Dialog>
      )}
      {editor && (
        <Dialog open onClose={() => !busy && setEditor(null)} fullWidth maxWidth="sm">
          <Box component="form" onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            if (editor.kind === "parent") {
              const parentId = String(form.get("parentId") ?? "") || null;
              void submit(() => moveScanner(editor.scanner.id, { kind: "parent", parentId }));
            } else {
              void submit(() => saveScanner(editor.scanner?.id ?? null, {
                title: String(form.get("title") ?? ""),
                webAddress: String(form.get("webAddress") ?? ""),
                level: String(form.get("level") ?? "") as keyof typeof levels | "",
                notes: String(form.get("notes") ?? ""),
                knownFailures: form.get("knownFailures") === "on",
                failureNotes: String(form.get("failureNotes") ?? ""),
              }));
            }
          }}>
            <DialogTitle>{editor.kind === "parent" ? "Move " + editor.scanner.title : editor.scanner ? "Edit scanner" : "Add scanner"}</DialogTitle>
            <DialogContent>
              <Stack spacing={2} sx={{ pt: 1 }}>
                {error && <Alert severity="error">{error}</Alert>}
                {editor.kind === "parent" ? (
                  <TextField select name="parentId" label="Parent" defaultValue={editor.scanner.parentId ?? ""}>
                    <MenuItem value="">Top level</MenuItem>
                    {rows.filter(({ scanner, ancestors }) =>
                      scanner.id !== editor.scanner.id && !ancestors.includes(editor.scanner.id),
                    ).map(({ scanner, path }) => (
                      <MenuItem key={scanner.id} value={scanner.id}>{path}</MenuItem>
                    ))}
                  </TextField>
                ) : (
                  <>
                    <TextField name="title" label="Title" defaultValue={editor.scanner?.title ?? ""} required />
                    <TextField select name="level" label="Level" defaultValue={editor.scanner?.level ?? ""}>
                      <MenuItem value="">Unspecified</MenuItem>
                      {Object.entries(levels).map(([value, label]) => (
                        <MenuItem key={value} value={value}>{label}</MenuItem>
                      ))}
                    </TextField>
                    <TextField name="webAddress" label="Web Address" type="url" defaultValue={editor.scanner?.webAddress ?? ""} />
                    <TextField name="notes" label="Link-specific instructions" helperText="Instructions for this URL only, including filters, pagination, documents, and known access issues."
                      defaultValue={editor.scanner?.notes ?? ""} multiline minRows={6} />
                    <FormControlLabel label="Known failures" control={<Checkbox name="knownFailures" defaultChecked={editor.scanner?.knownFailures ?? false} />} />
                    <TextField name="failureNotes" label="Failure notes" defaultValue={editor.scanner?.failureNotes ?? ""} multiline minRows={3} helperText="Known blockers and checks still needed for this link. Clear the flag when resolved." />
                  </>
                )}
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button disabled={busy} onClick={() => setEditor(null)}>Cancel</Button>
              <Button disabled={busy} type="submit" variant="contained">Save</Button>
            </DialogActions>
          </Box>
        </Dialog>
      )}
    </Stack>
  );
}


