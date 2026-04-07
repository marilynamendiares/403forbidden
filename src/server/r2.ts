// src/server/r2.ts
import { S3Client } from "@aws-sdk/client-s3";

type R2Config = {
  bucket: string | null;
  endpoint: string | null;
  accessKeyId: string | null;
  secretAccessKey: string | null;
  region: string;
};

let cachedClient: S3Client | null | undefined;

export function getR2Config(): R2Config {
  return {
    bucket: process.env.R2_BUCKET ?? null,
    endpoint: process.env.R2_ENDPOINT ?? null,
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? null,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? null,
    region: process.env.R2_REGION ?? "auto",
  };
}

export function getR2Status() {
  const config = getR2Config();
  return {
    hasBucket: Boolean(config.bucket),
    hasEndpoint: Boolean(config.endpoint),
    hasKey: Boolean(config.accessKeyId),
    hasSecret: Boolean(config.secretAccessKey),
    region: config.region,
  };
}

export function getR2Client() {
  if (cachedClient !== undefined) return cachedClient;

  const { endpoint, accessKeyId, secretAccessKey, region } = getR2Config();
  if (!endpoint || !accessKeyId || !secretAccessKey) {
    cachedClient = null;
    return cachedClient;
  }

  cachedClient = new S3Client({
    region,
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  });

  return cachedClient;
}
