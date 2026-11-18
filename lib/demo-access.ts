import { createHmac, timingSafeEqual } from "node:crypto";
import { prismadb } from "@/lib/prisma";

export function demoConfiguration() {
  const email = process.env.DEMO_ACCESS_EMAIL?.trim().toLowerCase();
  const digest = process.env.DEMO_ACCESS_DIGEST;
  const expiresAt = new Date(process.env.DEMO_ACCESS_EXPIRES_AT ?? "");
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!email || !digest || !/^[a-f0-9]{64}$/.test(digest) || !secret
    || !Number.isFinite(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()
    || expiresAt.getTime() > Date.now() + 31 * 24 * 60 * 60 * 1000) return null;
  return { email, digest, expiresAt, secret };
}

export async function verifyDemoAccess(email: string, code: string) {
  const config = demoConfiguration();
  if (!config) return null;
  const candidate = createHmac("sha256", config.secret)
    .update(JSON.stringify([config.email, config.expiresAt.toISOString(), code])).digest();
  const matches = email.trim().toLowerCase() === config.email
    && /^\d{6}$/.test(code)
    && timingSafeEqual(candidate, Buffer.from(config.digest, "hex"));
  // One lock per credential serializes guesses across processes and browsers.
  return prismadb.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${"demo:" + config.digest}))::text`;
    const id = config.digest.slice(0, 8) + "-" + config.digest.slice(8, 12) + "-4"
      + config.digest.slice(13, 16) + "-a" + config.digest.slice(17, 20) + "-" + config.digest.slice(20, 32);
    const attempt = await tx.verification.upsert({
      where: { id },
      create: { id, identifier: "demo-access:" + config.digest, value: "0", expiresAt: config.expiresAt },
      update: {},
    });
    const failures = Number(attempt.value);
    if (!Number.isInteger(failures) || failures >= 5 || config.expiresAt.getTime() <= Date.now()) return null;
    if (!matches) {
      await tx.verification.update({ where: { id }, data: { value: String(failures + 1) } });
      return null;
    }
    const user = await tx.users.findUnique({ where: { email: config.email } });
    if (!user || user.userStatus !== "ACTIVE"
      || (user.banned && (!user.banExpires || user.banExpires.getTime() > Date.now()))) return null;
    return { userId: user.id, expiresAt: config.expiresAt };
  }, { maxWait: 15_000, timeout: 15_000 });
}
