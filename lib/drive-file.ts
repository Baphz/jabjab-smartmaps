const GOOGLE_DRIVE_ID_PATTERN = /^[A-Za-z0-9_-]{10,}$/;

function parseUrlSafely(value: string) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

export function isLikelyGoogleDriveFileId(value: string) {
  return GOOGLE_DRIVE_ID_PATTERN.test(value.trim());
}

export function extractGoogleDriveFileId(value: string | null | undefined) {
  const trimmed = String(value ?? "").trim();

  if (!trimmed) {
    return null;
  }

  if (
    isLikelyGoogleDriveFileId(trimmed) &&
    !trimmed.includes("/") &&
    !trimmed.includes("?")
  ) {
    return trimmed;
  }

  const url = parseUrlSafely(trimmed);

  if (!url) {
    return null;
  }

  if (url.hostname === "drive.google.com" || url.hostname === "docs.google.com") {
    const fromQuery = url.searchParams.get("id");
    if (fromQuery && isLikelyGoogleDriveFileId(fromQuery)) {
      return fromQuery;
    }

    const pathMatch =
      url.pathname.match(/\/d\/([A-Za-z0-9_-]+)/) ??
      url.pathname.match(/\/file\/d\/([A-Za-z0-9_-]+)/);

    if (pathMatch?.[1] && isLikelyGoogleDriveFileId(pathMatch[1])) {
      return pathMatch[1];
    }
  }

  return null;
}

export function buildDriveProxyUrl(fileId: string) {
  return `/api/drive-files/${encodeURIComponent(fileId)}`;
}

export function isSupabasePublicStorageUrl(value: string) {
  const url = parseUrlSafely(value.trim());

  if (!url) {
    return false;
  }

  return url.pathname.includes("/storage/v1/object/public/");
}

export function extractSupabaseStorageObjectPath(
  value: string | null | undefined
) {
  const trimmed = String(value ?? "").trim();

  if (!trimmed) {
    return null;
  }

  const url = parseUrlSafely(trimmed);

  if (!url) {
    return null;
  }

  const marker = "/storage/v1/object/public/";
  const markerIndex = url.pathname.indexOf(marker);

  if (markerIndex === -1) {
    return null;
  }

  const remainder = url.pathname.slice(markerIndex + marker.length);
  const slashIndex = remainder.indexOf("/");

  if (slashIndex === -1) {
    return null;
  }

  const objectPath = remainder.slice(slashIndex + 1);

  return objectPath
    .split("/")
    .map((segment) => decodeURIComponent(segment))
    .join("/");
}

export function buildGoogleDriveThumbnailUrl(
  fileId: string,
  size: number = 1600
) {
  const safeSize = Number.isFinite(size) ? Math.max(64, Math.round(size)) : 1600;
  return `https://drive.google.com/thumbnail?id=${encodeURIComponent(
    fileId
  )}&sz=w${safeSize}`;
}

export function resolveStoredPhotoUrl(value: string | null | undefined) {
  const trimmed = String(value ?? "").trim();

  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("/")) {
    return trimmed;
  }

  const driveId = extractGoogleDriveFileId(trimmed);
  if (driveId) {
    return buildDriveProxyUrl(driveId);
  }

  return trimmed;
}
