import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { requireAuthenticated, documentReadScopeWhere, AuthenticationError } from "@/lib/authz";
import { prismadb } from "@/lib/prisma";
import { minioClient, MINIO_BUCKET } from "@/lib/minio";

export async function GET(_request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  try {
    const user = await requireAuthenticated();
    const { path } = await context.params;
    const [bucket, ...parts] = path;
    const key = parts.join("/");
    if (bucket !== MINIO_BUCKET || !key || parts.some(part => part === "." || part === "..")) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    // Avatars/images are shared within the authenticated app. Documents retain
    // the same owner/role/visibility policy as the documents server actions.
    if (!key.startsWith("avatars/") && !key.startsWith("images/")) {
      const doc = await prismadb.documents.findFirst({
        where: { ...(key.startsWith("thumbnails/") ? { id: key.slice("thumbnails/".length).replace(/\.png$/, "") } : { key }), ...documentReadScopeWhere(user) }, select: { id: true },
      });
      if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const url = await getSignedUrl(minioClient, new GetObjectCommand({ Bucket: MINIO_BUCKET, Key: key }), { expiresIn: 60 });
    const response = NextResponse.redirect(url);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch (error) {
    if (error instanceof AuthenticationError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw error;
  }
}
