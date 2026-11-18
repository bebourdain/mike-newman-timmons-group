import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { prismadb } from "../lib/prisma";
import { minioClient, MINIO_BUCKET } from "../lib/minio";

const base = process.env.NEON_VERIFY_BASE_URL || "http://localhost:3000";
const email = process.env.TEST_USER_EMAIL || "mike.newman@timmons.com";
async function main() {
  let cookie = "";
  let accountId: string | undefined;
  let documentId: string | undefined;
  let key: string | undefined;
  const marker = `neon-e2e-${randomUUID()}`;
  const call = (path: string, init: RequestInit = {}) => fetch(new URL(path, base), {
    ...init, headers: { Origin: base, "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}), ...init.headers },
  });
  try {
    const rejected = await call("/api/upload/presigned-url", { method: "POST", body: JSON.stringify({ filename: "check.txt", contentType: "text/plain" }) });
    assert.equal(rejected.status, 401);
    const send = await call("/api/auth/email-otp/send-verification-otp", { method: "POST", body: JSON.stringify({ email, type: "sign-in" }) });
    assert.equal(send.ok, true, `OTP request: ${send.status}`);
    let otp = process.env.NEON_VERIFY_OTP;
    if (!otp) otp = (await (await call(`/api/auth/test-otp?email=${encodeURIComponent(email)}`)).json()).otp;
    assert.ok(otp, "No test OTP available; use a development server's testUtils or supply NEON_VERIFY_OTP with a test login");
    const login = await call("/api/auth/sign-in/email-otp", { method: "POST", body: JSON.stringify({ email, otp }) });
    assert.equal(login.ok, true, `Sign-in: ${login.status}`);
    cookie = login.headers.getSetCookie().map(value => value.split(";")[0]).join("; ");
    const sessionResponse = await call("/api/auth/get-session");
    const session = await sessionResponse.json();
    assert.equal(session.user.email, email);
    console.log("PASS App authentication: OTP sign-in and database-backed session");
    const account = await prismadb.crm_Accounts.create({ data: { v: 0, name: marker, assigned_to: session.user.id } });
    accountId = account.id;
    const accountPage = await call(`/en/crm/accounts/${accountId}`);
    assert.equal(accountPage.status, 200);
    assert.ok((await accountPage.text()).includes(marker), "CRM page did not render the database account");
    console.log("PASS App Postgres: protected CRM page rendered the disposable database record");
    const uploadResponse = await call("/api/upload/presigned-url", { method: "POST", body: JSON.stringify({ filename: "check.txt", contentType: "text/plain", folder: "documents" }) });
    assert.equal(uploadResponse.ok, true, `Upload endpoint: ${uploadResponse.status}`);
    const upload = await uploadResponse.json(); key = upload.key;
    const cors = await fetch(upload.presignedUrl, { method: "OPTIONS", headers: { Origin: base, "Access-Control-Request-Method": "PUT", "Access-Control-Request-Headers": "content-type" } });
    assert.ok(cors.headers.get("access-control-allow-origin") === "*" || cors.headers.get("access-control-allow-origin") === base, "Storage CORS does not permit app uploads");
    const put = await fetch(upload.presignedUrl, { method: "PUT", body: marker, headers: { "Content-Type": "text/plain", Origin: base } });
    assert.equal(put.ok, true, `Storage PUT: ${put.status}`);
    const document = await prismadb.documents.create({ data: { document_name: marker, document_file_mimeType: "text/plain", document_file_url: upload.fileUrl, key, created_by_user: session.user.id, createdBy: session.user.id, assigned_user: session.user.id, visibility: "private" } });
    documentId = document.id;
    const download = await call(upload.fileUrl);
    assert.equal(download.status, 200);
    assert.equal(await download.text(), marker);
    const savedCookie = cookie; cookie = "";
    assert.equal((await call(upload.fileUrl, { redirect: "manual" })).status, 401);
    cookie = savedCookie;
    console.log("PASS App Object Storage: authenticated upload API, browser CORS, signed PUT, authorized download, anonymous denial");
  } finally {
    if (key) await minioClient.send(new DeleteObjectCommand({ Bucket: MINIO_BUCKET, Key: key }));
    if (documentId) await prismadb.documents.delete({ where: { id: documentId } });
    if (accountId) await prismadb.crm_Accounts.delete({ where: { id: accountId } });
    if (cookie) await call("/api/auth/sign-out", { method: "POST", body: "{}" });
    await prismadb.$disconnect(); minioClient.destroy();
    console.log("PASS App cleanup: test account, document, object, and session removed");
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
