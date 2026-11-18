"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAuthenticated } from "@/lib/authz";
import { prismadb } from "@/lib/prisma";

const idSchema = z.string().uuid();
const detailsSchema = z.object({
  title: z.string().trim().min(1).max(200),
  webAddress: z.string().trim().max(2048).refine(
    (value) => !value || (/^https?:\/\//i.test(value) && URL.canParse(value)),
  ),
  level: z.enum(['', 'state', 'county', 'city', 'town']),
  notes: z.string().trim().max(10000),
  knownFailures: z.boolean().default(false),
  failureNotes: z.string().trim().max(10000).default(""),
});

export async function saveScanner(id: string | null, input: z.input<typeof detailsSchema>) {
  await requireAuthenticated();
  const parsed = detailsSchema.safeParse(input);
  if (!parsed.success || (id !== null && !idSchema.safeParse(id).success)) {
    return { error: "Enter a title and a valid HTTP or HTTPS address." };
  }

  const data = {
    title: parsed.data.title,
    webAddress: parsed.data.webAddress || null,
    level: parsed.data.level || null,
    notes: parsed.data.notes || null,
    knownFailures: parsed.data.knownFailures,
    failureNotes: parsed.data.failureNotes || null,
  };

  await prismadb.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(184721, 1)`;
    if (id) {
      await tx.projectScanner.update({ where: { id }, data });
    } else {
      const last = await tx.projectScanner.findFirst({
        where: { parentId: null },
        orderBy: { position: "desc" },
        select: { position: true },
      });
      await tx.projectScanner.create({
        data: { ...data, position: (last?.position ?? -1) + 1 },
      });
    }
  });

  revalidatePath("/[locale]/projects/scanners", "page");
  return {};
}

const moveSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("up") }),
  z.object({ kind: z.literal("down") }),
  z.object({ kind: z.literal("parent"), parentId: idSchema.nullable() }),
]);

export async function moveScanner(id: string, input: z.input<typeof moveSchema>) {
  await requireAuthenticated();
  const parsed = moveSchema.safeParse(input);
  if (!idSchema.safeParse(id).success || !parsed.success) return { error: "Invalid move." };
  const move = parsed.data;

  const error = await prismadb.$transaction(async (tx) => {
    // Serialize tree mutations so concurrent moves cannot introduce a cycle.
    await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(184721, 1)`;
    const rows = await tx.projectScanner.findMany({
      select: { id: true, parentId: true, position: true },
      orderBy: [{ position: "asc" }, { id: "asc" }],
    });
    const byId = new Map(rows.map((row) => [row.id, row]));
    const row = byId.get(id);
    if (!row) return "Scanner no longer exists.";

    if (move.kind === "parent") {
      if (move.parentId === row.parentId) return;
      const visited = new Set([id]);
      let ancestor = move.parentId;
      while (ancestor !== null) {
        if (visited.has(ancestor)) return "A scanner cannot move inside its own branch.";
        visited.add(ancestor);
        const parent = byId.get(ancestor);
        if (!parent) return "The chosen parent no longer exists.";
        ancestor = parent.parentId;
      }
      const siblings = rows.filter((candidate) => candidate.parentId === move.parentId);
      await tx.projectScanner.update({
        where: { id },
        data: { parentId: move.parentId, position: (siblings.at(-1)?.position ?? -1) + 1 },
      });
      return;
    }

    const siblings = rows.filter((candidate) => candidate.parentId === row.parentId);
    const index = siblings.findIndex((sibling) => sibling.id === id);
    const other = siblings[index + (move.kind === "up" ? -1 : 1)];
    if (!other) return;
    await tx.projectScanner.update({ where: { id }, data: { position: other.position } });
    await tx.projectScanner.update({ where: { id: other.id }, data: { position: row.position } });
  });

  if (error) return { error };
  revalidatePath("/[locale]/projects/scanners", "page");
  return {};
}
