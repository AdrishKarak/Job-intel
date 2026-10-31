import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const hasS3Config = Boolean(
  process.env.AWS_ACCESS_KEY_ID &&
  process.env.AWS_SECRET_ACCESS_KEY &&
  process.env.AWS_ENDPOINT_URL_S3
);

const s3Client = hasS3Config
  ? new S3Client({
      endpoint: process.env.AWS_ENDPOINT_URL_S3,
      region: process.env.AWS_REGION || "ap-southeast-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
      forcePathStyle: true,
    })
  : null;

const BUCKET_NAME = process.env.STORAGE_BUCKET_NAME || "resumes";
const LOCAL_STORAGE_DIR = path.join(process.cwd(), ".storage_temp");

async function ensureLocalDir() {
  try {
    await fs.mkdir(LOCAL_STORAGE_DIR, { recursive: true });
  } catch {
    // Ignore error if directory already exists
  }
}

export interface StorageResult {
  uploadUrl: string;
  storagePath: string;
  isLocal: boolean;
}

export async function createPresignedUploadUrl(
  userId: string,
  filename: string,
  contentType: string
): Promise<StorageResult> {
  const extension = path.extname(filename).toLowerCase();
  const uniqueId = crypto.randomUUID();
  // Namespace strictly by userId (Security Requirement §4)
  const storagePath = `resumes/${userId}/${uniqueId}${extension}`;

  if (s3Client) {
    try {
      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: storagePath,
        ContentType: contentType,
      });

      const uploadUrl = await getSignedUrl(s3Client, command, {
        expiresIn: 900, // 15 minutes
      });

      return {
        uploadUrl,
        storagePath,
        isLocal: false,
      };
    } catch (err) {
      console.warn("Failed to generate S3 presigned URL, using local fallback:", err);
    }
  }

  // Local fallback
  await ensureLocalDir();
  return {
    uploadUrl: `/api/upload-resume-direct?path=${encodeURIComponent(storagePath)}`,
    storagePath,
    isLocal: true,
  };
}

export async function saveLocalResumeBuffer(
  storagePath: string,
  buffer: Buffer
): Promise<void> {
  await ensureLocalDir();
  const filePath = path.join(LOCAL_STORAGE_DIR, storagePath.replace(/\//g, "_"));
  await fs.writeFile(filePath, buffer);
}

export async function getResumeFileBuffer(storagePath: string): Promise<Buffer> {
  // Check local file first
  const localFilePath = path.join(LOCAL_STORAGE_DIR, storagePath.replace(/\//g, "_"));
  try {
    const data = await fs.readFile(localFilePath);
    return data;
  } catch {
    // Not found locally, attempt S3 download if configured
  }

  if (s3Client) {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: storagePath,
    });
    const response = await s3Client.send(command);
    if (!response.Body) {
      throw new Error(`Empty body returned from S3 for path: ${storagePath}`);
    }
    const byteArray = await response.Body.transformToByteArray();
    return Buffer.from(byteArray);
  }

  throw new Error(`Resume file not found at path: ${storagePath}`);
}

export async function deleteResumeFile(storagePath: string): Promise<void> {
  // 1. Delete local file if exists
  const localFilePath = path.join(LOCAL_STORAGE_DIR, storagePath.replace(/\//g, "_"));
  try {
    await fs.unlink(localFilePath);
  } catch {
    // Ignore if not present
  }

  // 2. Delete from S3 if configured (ADR-005, ADR-013)
  if (s3Client) {
    try {
      const command = new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: storagePath,
      });
      await s3Client.send(command);
    } catch (err) {
      console.error(`Failed to delete S3 resume file at ${storagePath}:`, err);
    }
  }
}
