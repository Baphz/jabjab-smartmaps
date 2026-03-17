import "server-only";

import { randomUUID } from "node:crypto";
import { extname } from "node:path";
import { createClient } from "@supabase/supabase-js";

type SupabaseStorageConfig = {
  url: string;
  serviceRoleKey: string;
  bucket: string;
  maxBytes: number;
};

type UploadedSupabaseFile = {
  path: string;
  publicUrl: string;
};

function readRequiredEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Environment variable ${name} belum diisi.`);
  }

  return value;
}

function sanitizeSegment(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function resolveExtension(fileName: string, mimeType: string) {
  const extension = extname(fileName).trim();
  if (extension) {
    return extension.toLowerCase();
  }

  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/webp") return ".webp";
  if (mimeType === "image/gif") return ".gif";
  return ".jpg";
}

function getSupabaseStorageConfig(): SupabaseStorageConfig {
  return {
    url: readRequiredEnv("SUPABASE_URL").replace(/\/+$/, ""),
    serviceRoleKey: readRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    bucket: readRequiredEnv("SUPABASE_STORAGE_BUCKET"),
    maxBytes: Number(process.env.SUPABASE_STORAGE_MAX_BYTES ?? 10 * 1024 * 1024),
  };
}

export function isSupabaseStorageConfigured() {
  return Boolean(
    process.env.SUPABASE_URL?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() &&
      process.env.SUPABASE_STORAGE_BUCKET?.trim()
  );
}

function createSupabaseAdminClient() {
  const config = getSupabaseStorageConfig();

  return createClient(config.url, config.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

async function ensureBucketExists() {
  const config = getSupabaseStorageConfig();
  const client = createSupabaseAdminClient();
  const existing = await client.storage.getBucket(config.bucket);

  if (!existing.error) {
    return;
  }

  const message = existing.error.message.toLowerCase();
  if (!message.includes("not found")) {
    throw new Error(existing.error.message);
  }

  const created = await client.storage.createBucket(config.bucket, {
    public: true,
    fileSizeLimit: String(config.maxBytes),
    allowedMimeTypes: ["image/*"],
  });

  if (created.error) {
    throw new Error(created.error.message);
  }
}

function buildObjectName(args: {
  kind: string;
  originalFileName: string;
  mimeType: string;
}) {
  const kind = sanitizeSegment(args.kind || "image");
  const originalBase = sanitizeSegment(
    args.originalFileName.replace(/\.[^.]+$/, "") || "file"
  );
  const extension = resolveExtension(args.originalFileName, args.mimeType);

  return `${kind}-${originalBase}-${randomUUID()}${extension}`;
}

function buildObjectPath(args: {
  labId?: string | null;
  bucket: string;
  kind: string;
  originalFileName: string;
  mimeType: string;
}) {
  const area = sanitizeSegment(args.bucket || "profile");
  const fileName = buildObjectName({
    kind: args.kind,
    originalFileName: args.originalFileName,
    mimeType: args.mimeType,
  });

  if (args.labId) {
    return `labs/${sanitizeSegment(args.labId)}/${area}/${fileName}`;
  }

  return `super-admin-drafts/${area}/${fileName}`;
}

export function buildSupabasePublicObjectUrl(path: string) {
  const config = getSupabaseStorageConfig();
  return `${config.url}/storage/v1/object/public/${encodeURIComponent(
    config.bucket
  )}/${path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;
}

export async function uploadImageToSupabaseStorage(args: {
  fileBuffer: Buffer;
  originalFileName: string;
  mimeType: string;
  kind: string;
  labId?: string | null;
  bucket: string;
}) {
  const config = getSupabaseStorageConfig();

  if (!args.mimeType.startsWith("image/")) {
    throw new Error("Hanya file gambar yang boleh di-upload.");
  }

  if (args.fileBuffer.byteLength > config.maxBytes) {
    throw new Error(
      `Ukuran file melebihi batas ${Math.round(config.maxBytes / 1024 / 1024)}MB.`
    );
  }

  await ensureBucketExists();
  const client = createSupabaseAdminClient();
  const objectPath = buildObjectPath({
    labId: args.labId,
    bucket: args.bucket,
    kind: args.kind,
    originalFileName: args.originalFileName,
    mimeType: args.mimeType,
  });

  const uploaded = await client.storage.from(config.bucket).upload(objectPath, args.fileBuffer, {
    contentType: args.mimeType,
    cacheControl: "3600",
    upsert: false,
  });

  if (uploaded.error) {
    throw new Error(uploaded.error.message);
  }

  return {
    path: objectPath,
    publicUrl: buildSupabasePublicObjectUrl(objectPath),
  } satisfies UploadedSupabaseFile;
}

export async function deleteSupabaseStorageObject(path: string) {
  const config = getSupabaseStorageConfig();
  const client = createSupabaseAdminClient();
  const removed = await client.storage.from(config.bucket).remove([path]);

  if (removed.error) {
    throw new Error(removed.error.message);
  }
}
