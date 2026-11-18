import { S3Client } from "@aws-sdk/client-s3";

// Neon supplies AWS-standard variables. Keep MinIO configurations working too.
const endpoint = process.env.AWS_ENDPOINT_URL_S3 || process.env.MINIO_ENDPOINT;
const accessKeyId = process.env.AWS_ACCESS_KEY_ID || process.env.MINIO_ACCESS_KEY;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || process.env.MINIO_SECRET_KEY;
export const MINIO_BUCKET = process.env.AWS_ENDPOINT_URL_S3
  ? "nextcrm-files"
  : process.env.MINIO_BUCKET!;
export const minioClient = new S3Client({
  endpoint,
  region: process.env.AWS_REGION || "us-east-1",
  ...(accessKeyId && secretAccessKey ? { credentials: { accessKeyId, secretAccessKey } } : {}),
  forcePathStyle: true,
});
// Private Neon objects are served through the app's authorized download route.
export const MINIO_PUBLIC_URL = process.env.AWS_ENDPOINT_URL_S3
  ? "/api/storage"
  : process.env.NEXT_PUBLIC_MINIO_ENDPOINT;
