import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";
const GOOGLE_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/gmail.send",
];

type TokenResponse = {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  error?: string;
  error_description?: string;
};

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

export function getGoogleRedirectUri() {
  const configured = process.env.GOOGLE_REDIRECT_URI?.trim();
  if (configured) return configured;
  const siteUrl = requiredEnv("NEXT_PUBLIC_SITE_URL").replace(/\/$/, "");
  return `${siteUrl}/api/google/callback`;
}

function encryptionKey() {
  const secret =
    process.env.GOOGLE_TOKEN_ENCRYPTION_KEY?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim();
  if (!secret) throw new Error("GOOGLE_TOKEN_ENCRYPTION_KEY or NEXTAUTH_SECRET is required.");
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptGoogleToken(token: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map((part) => part.toString("base64url")).join(".");
}

function decryptGoogleToken(value: string) {
  const [ivValue, tagValue, encryptedValue] = value.split(".");
  if (!ivValue || !tagValue || !encryptedValue) throw new Error("Stored Google token is invalid.");

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(ivValue, "base64url")
  );
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function createGoogleAuthorizationUrl(state: string) {
  const params = new URLSearchParams({
    client_id: requiredEnv("GOOGLE_CLIENT_ID"),
    redirect_uri: getGoogleRedirectUri(),
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    scope: GOOGLE_SCOPES.join(" "),
    state,
    login_hint: process.env.GOOGLE_ACCOUNT_EMAIL?.trim() || "qinglilab@gmail.com",
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

async function tokenRequest(params: URLSearchParams) {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
    cache: "no-store",
  });
  const data = (await response.json()) as TokenResponse;
  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || "Google token exchange failed.");
  }
  return data;
}

export async function exchangeGoogleCode(code: string) {
  return tokenRequest(
    new URLSearchParams({
      client_id: requiredEnv("GOOGLE_CLIENT_ID"),
      client_secret: requiredEnv("GOOGLE_CLIENT_SECRET"),
      redirect_uri: getGoogleRedirectUri(),
      grant_type: "authorization_code",
      code,
    })
  );
}

export async function getGoogleAccountEmail(accessToken: string) {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Could not verify the connected Google account.");
  const data = (await response.json()) as { email?: string };
  if (!data.email) throw new Error("The connected Google account did not return an email address.");
  return data.email.toLowerCase();
}

export async function saveGoogleConnection(email: string, refreshToken: string) {
  cachedAccessToken = null;
  return prisma.googleConnection.upsert({
    where: { id: "google" },
    update: { email, encryptedRefreshToken: encryptGoogleToken(refreshToken) },
    create: {
      id: "google",
      email,
      encryptedRefreshToken: encryptGoogleToken(refreshToken),
    },
  });
}

export async function getGoogleAccessToken() {
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now() + 60_000) {
    return cachedAccessToken.token;
  }

  const connection = await prisma.googleConnection.findUnique({ where: { id: "google" } });
  if (!connection) throw new Error("Google Drive and Gmail are not connected.");

  const data = await tokenRequest(
    new URLSearchParams({
      client_id: requiredEnv("GOOGLE_CLIENT_ID"),
      client_secret: requiredEnv("GOOGLE_CLIENT_SECRET"),
      grant_type: "refresh_token",
      refresh_token: decryptGoogleToken(connection.encryptedRefreshToken),
    })
  );

  cachedAccessToken = {
    token: data.access_token!,
    expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
  };
  return cachedAccessToken.token;
}

export async function startResumableDriveUpload(args: {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}) {
  const accessToken = await getGoogleAccessToken();
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID?.trim();
  const response = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,mimeType,size",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": args.mimeType || "application/octet-stream",
        "X-Upload-Content-Length": String(args.sizeBytes),
      },
      body: JSON.stringify({
        name: args.fileName,
        ...(folderId ? { parents: [folderId] } : {}),
      }),
    }
  );
  const sessionUrl = response.headers.get("location");
  if (!response.ok || !sessionUrl) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Could not start Google Drive upload (${response.status}): ${detail}`);
  }
  return sessionUrl;
}

export async function getDriveDocumentMetadata(fileId: string) {
  const accessToken = await getGoogleAccessToken();
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=id,name,mimeType,size,trashed`,
    { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" }
  );
  const result = (await response.json()) as {
    id?: string;
    name?: string;
    mimeType?: string;
    size?: string;
    trashed?: boolean;
    error?: { message?: string };
  };
  if (!response.ok || !result.id || result.trashed) {
    throw new Error(result.error?.message || "The uploaded Drive file could not be verified.");
  }
  return {
    id: result.id,
    name: result.name || "document",
    mimeType: result.mimeType || "application/octet-stream",
    sizeBytes: Number(result.size || 0),
  };
}

export async function deleteDriveDocument(fileId: string) {
  const accessToken = await getGoogleAccessToken();
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok && response.status !== 404) {
    throw new Error("Google Drive file deletion failed.");
  }
}

export async function downloadDriveDocument(fileId: string, range?: string | null) {
  const accessToken = await getGoogleAccessToken();
  const headers: Record<string, string> = { Authorization: `Bearer ${accessToken}` };
  if (range) headers.Range = range;
  return fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
    { headers, cache: "no-store" }
  );
}

function safeHeader(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim();
}

export async function sendGoogleMail(args: { to: string; subject: string; html: string }) {
  const accessToken = await getGoogleAccessToken();
  const connection = await prisma.googleConnection.findUniqueOrThrow({ where: { id: "google" } });
  const encodedSubject = Buffer.from(safeHeader(args.subject), "utf8").toString("base64");
  const message = [
    `From: Qing Li Lab <${safeHeader(connection.email)}>`,
    `To: ${safeHeader(args.to)}`,
    `Subject: =?UTF-8?B?${encodedSubject}?=`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    args.html,
  ].join("\r\n");
  const raw = Buffer.from(message, "utf8").toString("base64url");

  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw }),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Gmail send failed (${response.status}): ${detail}`);
  }
}
