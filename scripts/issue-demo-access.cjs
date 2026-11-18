const { randomInt, createHmac } = require("node:crypto");

const email = process.argv[2]?.trim().toLowerCase();
const secret = process.env.BETTER_AUTH_SECRET;
const days = process.argv[3] === undefined ? 1 : Number(process.argv[3]);
if (!email || !email.includes("@") || !secret || !Number.isInteger(days) || days < 1 || days > 31) {
  console.error("Run with the existing environment loaded and pass the designated account email and optional duration (1–31 days).");
  process.exitCode = 1;
} else {
  const code = String(randomInt(0, 1000000)).padStart(6, "0");
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  const digest = createHmac("sha256", secret).update(JSON.stringify([email, expiresAt, code])).digest("hex");
  console.log("Demo code (share privately): " + code);
  console.log("DEMO_ACCESS_EMAIL=" + email);
  console.log("DEMO_ACCESS_EXPIRES_AT=" + expiresAt);
  console.log("DEMO_ACCESS_DIGEST=" + digest);
}
