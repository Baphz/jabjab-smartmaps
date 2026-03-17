export function normalizeBaseUrl(value?: string | null) {
  const raw = String(value ?? "").trim();

  if (!raw) {
    return null;
  }

  const withProtocol =
    raw.startsWith("http://") || raw.startsWith("https://")
      ? raw
      : `https://${raw}`;

  try {
    const url = new URL(withProtocol);
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

export function getAppBaseUrl(req: Request) {
  const envCandidates = [
    process.env.APP_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL,
  ];

  for (const candidate of envCandidates) {
    const normalized = normalizeBaseUrl(candidate);

    if (!normalized) {
      continue;
    }

    const hostname = new URL(normalized).hostname;

    if (hostname !== "localhost" && hostname !== "127.0.0.1") {
      return normalized;
    }
  }

  const forwardedHost = req.headers.get("x-forwarded-host");
  const forwardedProto = req.headers.get("x-forwarded-proto") ?? "https";

  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  for (const candidate of envCandidates) {
    const normalized = normalizeBaseUrl(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return new URL(req.url).origin;
}

export function buildInvitationRedirectUrl(req: Request, params: URLSearchParams) {
  return `${getAppBaseUrl(req)}/accept-invitation?${params.toString()}`;
}
