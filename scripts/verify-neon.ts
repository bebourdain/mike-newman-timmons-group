import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { prismadb } from "../lib/prisma";
import { minioClient, MINIO_BUCKET } from "../lib/minio";

async function main() {
  const marker = `neon-verification-${randomUUID()}`;
  const key = `verification/${marker}.txt`;
  let accountId: string | undefined;
  try {
    const account = await prismadb.crm_Accounts.create({ data: { v: 0, name: marker } });
    accountId = account.id;
    assert.equal((await prismadb.crm_Accounts.findUnique({ where: { id: accountId } }))?.name, marker);
    console.log("PASS Postgres: app Prisma client created and read a disposable CRM account");
    const putUrl = await getSignedUrl(minioClient, new PutObjectCommand({ Bucket: MINIO_BUCKET, Key: key, ContentType: "text/plain" }), { expiresIn: 60 });
    const put = await fetch(putUrl, { method: "PUT", body: marker, headers: { "Content-Type": "text/plain" } });
    assert.equal(put.ok, true, `Presigned upload failed: HTTP ${put.status}`);
    const getUrl = await getSignedUrl(minioClient, new GetObjectCommand({ Bucket: MINIO_BUCKET, Key: key }), { expiresIn: 60 });
    const get = await fetch(getUrl);
    assert.equal(await get.text(), marker);
    const anonymous = await fetch(getUrl.split("?")[0]);
    assert.equal(anonymous.ok, false, "Private bucket allowed anonymous read");
    console.log("PASS Object Storage: presigned upload/download matched; anonymous access denied");
  } finally {
    await minioClient.send(new DeleteObjectCommand({ Bucket: MINIO_BUCKET, Key: key }));
    if (accountId) await prismadb.crm_Accounts.delete({ where: { id: accountId } });
    const deleted = await minioClient.send(new GetObjectCommand({ Bucket: MINIO_BUCKET, Key: key })).then(() => false, error => error.$metadata?.httpStatusCode === 404);
    assert.equal(deleted, true, "Storage cleanup verification failed");
    console.log("PASS Cleanup: disposable CRM account and storage object removed");
    await prismadb.$disconnect();
    minioClient.destroy();
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
