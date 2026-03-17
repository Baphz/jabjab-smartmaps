import "server-only";

import { createSign, randomUUID } from "node:crypto";
import { extname } from "node:path";

type GoogleDriveTokenCache = {
  accessToken: string;
  expiresAt: number;
} | null;

type GoogleDriveConfig = {
  clientEmail: string;
  privateKey: string;
  folderId: string;
  maxBytes: number;
};

type UploadedDriveFile = {
  id: string;
  name: string;
  mimeType?: string;
};

const GOOGLE_DRIVE_FOLDER_MIME = "application/vnd.google-apps.folder";

let tokenCache: GoogleDriveTokenCache = null;

function readRequiredEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Environment variable ${name} belum diisi.`);
  }

  return value;
}

function getGoogleDriveConfig(): GoogleDriveConfig {
  return {
    clientEmail: readRequiredEnv("GOOGLE_DRIVE_CLIENT_EMAIL"),
    privateKey: readRequiredEnv("GOOGLE_DRIVE_PRIVATE_KEY").replace(/\\n/g, "\n"),
    folderId: readRequiredEnv("GOOGLE_DRIVE_FOLDER_ID"),
    maxBytes: Number(process.env.GOOGLE_DRIVE_MAX_BYTES ?? 10 * 1024 * 1024),
  };
}

export function isGoogleDriveConfigured() {
  return Boolean(
    process.env.GOOGLE_DRIVE_CLIENT_EMAIL?.trim() &&
      process.env.GOOGLE_DRIVE_PRIVATE_KEY?.trim() &&
      process.env.GOOGLE_DRIVE_FOLDER_ID?.trim()
  );
}

function escapeDriveQueryValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function toBase64Url(value: Buffer | string) {
  const buffer = typeof value === "string" ? Buffer.from(value) : value;

  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function createServiceAccountJwt(config: GoogleDriveConfig) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = {
    iss: config.clientEmail,
    scope: "https://www.googleapis.com/auth/drive",
    aud: "https://oauth2.googleapis.com/token",
    exp: issuedAt + 3600,
    iat: issuedAt,
  };
  const header = {
    alg: "RS256",
    typ: "JWT",
  };

  const encodedHeader = toBase64Url(JSON.stringify(header));
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  const signer = createSign("RSA-SHA256");
  signer.update(signatureInput);
  signer.end();

  const signature = signer.sign(config.privateKey);

  return `${signatureInput}.${toBase64Url(signature)}`;
}

export async function getGoogleDriveAccessToken() {
  if (tokenCache && tokenCache.expiresAt - Date.now() > 60_000) {
    return tokenCache.accessToken;
  }

  const config = getGoogleDriveConfig();
  const assertion = createServiceAccountJwt(config);
  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion,
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  const payload = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
    error_description?: string;
    error?: string;
  };

  if (!response.ok || !payload.access_token) {
    throw new Error(
      payload.error_description ??
        payload.error ??
        "Gagal mengambil access token Google Drive."
    );
  }

  tokenCache = {
    accessToken: payload.access_token,
    expiresAt: Date.now() + Number(payload.expires_in ?? 3600) * 1000,
  };

  return tokenCache.accessToken;
}

async function driveRequest(
  input: string,
  init?: RequestInit & { accessToken?: string }
) {
  const accessToken = init?.accessToken ?? (await getGoogleDriveAccessToken());
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);

  return fetch(input, {
    ...init,
    headers,
    cache: "no-store",
  });
}

async function driveJsonRequest<T>(
  input: string,
  init?: RequestInit & { accessToken?: string }
) {
  const response = await driveRequest(input, init);
  const payload = (await response.json().catch(() => ({}))) as T & {
    error?: {
      message?: string;
    };
  };

  if (!response.ok) {
    throw new Error(
      payload.error?.message ?? "Google Drive request gagal diproses."
    );
  }

  return payload;
}

function sanitizeFileName(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

type DriveFolderItem = {
  id: string;
  name: string;
  mimeType: string;
};

async function findDriveFolderByName(args: {
  parentId: string;
  name: string;
  accessToken: string;
}) {
  const params = new URLSearchParams({
    q: [
      `mimeType = '${GOOGLE_DRIVE_FOLDER_MIME}'`,
      `name = '${escapeDriveQueryValue(args.name)}'`,
      `'${escapeDriveQueryValue(args.parentId)}' in parents`,
      "trashed = false",
    ].join(" and "),
    fields: "files(id,name,mimeType)",
    pageSize: "1",
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
  });

  const payload = await driveJsonRequest<{ files?: DriveFolderItem[] }>(
    `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
    {
      method: "GET",
      accessToken: args.accessToken,
    }
  );

  return payload.files?.[0] ?? null;
}

async function createDriveFolder(args: {
  parentId: string;
  name: string;
  accessToken: string;
}) {
  return driveJsonRequest<DriveFolderItem>(
    "https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&fields=id,name,mimeType",
    {
      method: "POST",
      accessToken: args.accessToken,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: args.name,
        mimeType: GOOGLE_DRIVE_FOLDER_MIME,
        parents: [args.parentId],
      }),
    }
  );
}

async function getOrCreateDriveFolder(args: {
  parentId: string;
  name: string;
  accessToken: string;
}) {
  const existing = await findDriveFolderByName(args);
  if (existing) {
    return existing;
  }

  return createDriveFolder(args);
}

async function getOrCreateDriveFolderPath(args: {
  rootParentId: string;
  segments: string[];
  accessToken: string;
}) {
  let parentId = args.rootParentId;

  for (const segment of args.segments) {
    const folder = await getOrCreateDriveFolder({
      parentId,
      name: segment,
      accessToken: args.accessToken,
    });
    parentId = folder.id;
  }

  return parentId;
}

export async function resolveDriveUploadFolderId(args: {
  labId?: string | null;
  bucket: string;
}) {
  const config = getGoogleDriveConfig();
  const accessToken = await getGoogleDriveAccessToken();
  const bucket = sanitizeFileName(args.bucket || "uploads");

  const segments = args.labId
    ? ["labs", `lab-${sanitizeFileName(args.labId)}`, bucket]
    : ["super-admin-drafts", bucket];

  return getOrCreateDriveFolderPath({
    rootParentId: config.folderId,
    segments,
    accessToken,
  });
}

async function getDriveFileParents(fileId: string, accessToken: string) {
  const payload = await driveJsonRequest<{ parents?: string[] }>(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
      fileId
    )}?fields=parents&supportsAllDrives=true`,
    {
      method: "GET",
      accessToken,
    }
  );

  return payload.parents ?? [];
}

export async function moveGoogleDriveFileToFolder(args: {
  fileId: string;
  folderId: string;
}) {
  const accessToken = await getGoogleDriveAccessToken();
  const previousParents = await getDriveFileParents(args.fileId, accessToken);

  const params = new URLSearchParams({
    addParents: args.folderId,
    fields: "id,parents",
    supportsAllDrives: "true",
  });

  if (previousParents.length > 0) {
    params.set("removeParents", previousParents.join(","));
  }

  await driveJsonRequest<{ id: string }>(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
      args.fileId
    )}?${params.toString()}`,
    {
      method: "PATCH",
      accessToken,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    }
  );
}

export async function moveGoogleDriveFileToLabBucket(args: {
  fileId: string;
  labId: string;
  bucket: string;
}) {
  const folderId = await resolveDriveUploadFolderId({
    labId: args.labId,
    bucket: args.bucket,
  });

  await moveGoogleDriveFileToFolder({
    fileId: args.fileId,
    folderId,
  });
}

export async function deleteGoogleDriveFile(fileId: string) {
  await driveRequest(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
      fileId
    )}?supportsAllDrives=true`,
    {
      method: "DELETE",
    }
  );
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

export function buildGoogleDriveUploadName(args: {
  kind: string;
  originalFileName: string;
}) {
  const kind = sanitizeFileName(args.kind || "image");
  const originalBase = sanitizeFileName(
    args.originalFileName.replace(/\.[^.]+$/, "") || "file"
  );
  const extension = resolveExtension(args.originalFileName, "");

  return `${kind}-${originalBase}-${randomUUID()}${extension}`;
}

export async function uploadImageToGoogleDrive(args: {
  fileBuffer: Buffer;
  originalFileName: string;
  mimeType: string;
  kind: string;
  parentFolderId?: string;
}) {
  const config = getGoogleDriveConfig();

  if (!args.mimeType.startsWith("image/")) {
    throw new Error("Hanya file gambar yang boleh di-upload.");
  }

  if (args.fileBuffer.byteLength > config.maxBytes) {
    throw new Error(
      `Ukuran file melebihi batas ${Math.round(config.maxBytes / 1024 / 1024)}MB.`
    );
  }

  const accessToken = await getGoogleDriveAccessToken();
  const boundary = `smartmaps-${randomUUID()}`;
  const fileName = buildGoogleDriveUploadName({
    kind: args.kind,
    originalFileName: args.originalFileName,
  }).replace(/\.[^.]+$/, resolveExtension(args.originalFileName, args.mimeType));
  const metadata = {
    name: fileName,
    parents: [args.parentFolderId ?? config.folderId],
  };

  const metadataPart = Buffer.from(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(
      metadata
    )}\r\n`
  );
  const mediaHeader = Buffer.from(
    `--${boundary}\r\nContent-Type: ${args.mimeType}\r\n\r\n`
  );
  const closing = Buffer.from(`\r\n--${boundary}--`);
  const body = Buffer.concat([
    metadataPart,
    mediaHeader,
    args.fileBuffer,
    closing,
  ]);

  const response = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,name,mimeType",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
      cache: "no-store",
    }
  );

  const payload = (await response.json()) as UploadedDriveFile & {
    error?: {
      message?: string;
    };
  };

  if (!response.ok || !payload.id) {
    throw new Error(
      payload.error?.message ?? "Gagal meng-upload file ke Google Drive."
    );
  }

  return payload;
}

export async function downloadImageFromGoogleDrive(fileId: string) {
  const accessToken = await getGoogleDriveAccessToken();

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
      fileId
    )}?alt=media&supportsAllDrives=true`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error("Gagal mengambil file gambar dari Google Drive.");
  }

  return response;
}
