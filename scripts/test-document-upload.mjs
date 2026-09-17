import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const require = createRequire(import.meta.url);
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));

// Load the actual route/helpers with isolated dependencies. These tests never
// connect to the database, upload a file, or send email.
function loadModule(file, mocks, globals = {}) {
  const source = fs.readFileSync(path.join(scriptDirectory, "..", file), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  });
  const exports = {};
  vm.runInNewContext(outputText, {
    exports, require: (name) => name in mocks ? mocks[name] : require(name),
    process: { env: {} }, Buffer, URLSearchParams, Error, ...globals,
  }, { filename: file });
  return exports;
}

const nextServer = { NextResponse: { json: (body, options) => Response.json(body, options) } };
const access = {
  requireAdminUser: async () => ({ id: "admin", name: "Admin", email: "admin@example.test" }),
  escapeHtml: (value) => value,
};

function completeRoute({ failEmail = false } = {}) {
  const calls = { email: [], documents: [], notified: [] };
  const { POST } = loadModule("src/app/api/documents/upload/complete/route.ts", {
    "next/server": nextServer,
    "@/lib/document-access": access,
    "@/lib/prisma": { prisma: {
      user: { findMany: async () => [{ id: "member", name: "Member", email: "member@example.test" }] },
      labDocument: { create: async ({ data }) => {
        calls.documents.push(data);
        return { ...data, createdAt: new Date("2026-09-17T12:00:00Z") };
      } },
      documentRecipient: { updateMany: async (query) => calls.notified.push(query) },
    } },
    "@/lib/google": {
      getDriveDocumentMetadata: async () => ({ id: "drive-file", name: "file.pdf", mimeType: "application/pdf", sizeBytes: 10 }),
      sendGoogleMail: async (mail) => {
        calls.email.push(mail);
        if (failEmail) throw new Error("Email unavailable");
      },
    },
  });
  return {
    calls,
    post: async (options = {}) => POST({
      json: async () => ({ title: "Document", description: "Summary", driveFileId: "drive-file", userIds: ["member"], ...options }),
      nextUrl: new URL("https://lab.example.test"),
    }),
  };
}

test("upload without email preserves private access and website notifications", async () => {
  const route = completeRoute();
  const response = await route.post({ sendEmail: false });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.recipientCount, 1);
  assert.equal(result.emailCount, 0);
  assert.equal(result.emailFailureCount, 0);
  assert.equal(route.calls.email.length, 0);
  assert.equal(route.calls.notified.length, 0);
  const document = route.calls.documents[0];
  assert.equal(document.isPublic, false);
  assert.equal(document.emailSubject, "Document");
  assert.equal(document.recipients.create[0].userId, "member");
  assert.equal(document.notifications.create[0].userId, "member");
});

test("email remains enabled by default and records successful delivery", async () => {
  const route = completeRoute();
  const response = await route.post({ emailSubject: "New document" });
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.equal(route.calls.email.length, 1);
  assert.equal(route.calls.email[0].subject, "New document");
  assert.equal(result.emailCount, 1);
  assert.equal(result.emailFailureCount, 0);
  assert.equal(route.calls.notified.length, 1);
});

test("failed email still publishes the document and website notification", async () => {
  const route = completeRoute({ failEmail: true });
  const response = await route.post({ sendEmail: true, emailSubject: "New document" });
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.equal(route.calls.documents.length, 1);
  assert.equal(result.emailCount, 0);
  assert.equal(result.emailFailureCount, 1);
  assert.equal(route.calls.notified.length, 0);
});

test("email uploads require a subject and reject malformed email preferences", async () => {
  const route = completeRoute();
  assert.equal((await route.post({ sendEmail: true })).status, 400);
  assert.equal((await route.post({ sendEmail: "false" })).status, 400);
  assert.equal(route.calls.documents.length, 0);
  assert.equal(route.calls.email.length, 0);
});

test("public-only uploads never email or create recipient notifications", async () => {
  const route = completeRoute();
  const response = await route.post({ publicOnly: true, sendEmail: true });
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.equal(route.calls.documents[0].isPublic, true);
  assert.equal(route.calls.documents[0].recipients.create.length, 0);
  assert.equal(route.calls.documents[0].notifications.create.length, 0);
  assert.equal(route.calls.email.length, 0);
  assert.equal(result.emailFailureCount, 0);
});

test("private uploads without email still require an audience", async () => {
  const route = completeRoute();
  const response = await route.post({ sendEmail: false, userIds: [] });
  assert.equal(response.status, 400);
  assert.equal(route.calls.documents.length, 0);
});

test("expired Google refresh tokens return an actionable reconnect response", async () => {
  const google = loadModule("src/lib/google.ts", { "@/lib/prisma": {} }, {
    fetch: async () => Response.json({ error: "invalid_grant", error_description: "Token has been expired or revoked." }, { status: 400 }),
    process: { env: { GOOGLE_CLIENT_ID: "test", GOOGLE_CLIENT_SECRET: "test", GOOGLE_REDIRECT_URI: "https://lab.example.test/api/google/callback" } },
  });
  // This invokes the actual token request through the public authorization-code
  // helper first, checking that an invalid code is not mistaken for refresh expiry.
  await assert.rejects(google.exchangeGoogleCode("bad-code"), (error) => {
    assert.equal(error instanceof google.GoogleReconnectRequiredError, false);
    assert.equal(error.message, "Token has been expired or revoked.");
    return true;
  });

  const env = { GOOGLE_CLIENT_ID: "test", GOOGLE_CLIENT_SECRET: "test", NEXTAUTH_SECRET: "test-secret" };
  let encryptedToken;
  const refreshGoogle = loadModule("src/lib/google.ts", {
    "@/lib/prisma": { prisma: { googleConnection: { findUnique: async () => ({ encryptedRefreshToken: encryptedToken }) } } },
  }, {
    fetch: async () => Response.json({ error: "invalid_grant" }, { status: 400 }),
    process: { env },
  });
  encryptedToken = refreshGoogle.encryptGoogleToken("expired-refresh-token");
  await assert.rejects(refreshGoogle.getGoogleAccessToken(), refreshGoogle.GoogleReconnectRequiredError);

  const { POST } = loadModule("src/app/api/documents/upload/start/route.ts", {
    "next/server": nextServer,
    "@/lib/document-access": access,
    "@/lib/prisma": {},
    "@/lib/google": { ...refreshGoogle, startResumableDriveUpload: () => refreshGoogle.getGoogleAccessToken() },
  });
  const response = await POST({ json: async () => ({ fileName: "file.pdf", sizeBytes: 10 }) });
  const result = await response.json();
  assert.equal(response.status, 409);
  assert.equal(result.reconnectRequired, true);
  assert.match(result.error, /Reconnect Google Drive and Gmail/);
});

function uploadForm(fetch, sendEmail = true) {
  const state = [];
  const fileData = new FormData();
  fileData.set("file", new File(["document"], "file.txt", { type: "text/plain" }));
  fileData.set("title", "Document");
  fileData.set("description", "Summary");
  fileData.set("userIds", "member");
  const { default: Form } = loadModule("src/app/members/documents/DocumentUploadForm.tsx", {
    react: { useState: (initial) => {
      const index = state.length;
      state.push(index === 5 ? sendEmail : initial);
      return [state[index], (value) => { state[index] = value; }];
    } },
    "next-intl": { useTranslations: () => (key) => key },
    "next/navigation": { useRouter: () => ({ refresh() {} }) },
  }, {
    fetch, File,
    FormData: class { constructor() { return fileData; } },
  });
  const form = Form({ users: [], categories: [] });
  return { state, submit: () => form.props.onSubmit({ preventDefault() {}, currentTarget: { reset() {} } }) };
}

test("upload form displays the server error instead of the generic start failure", async () => {
  const form = uploadForm(async () => Response.json({ error: "Google Drive storage quota exceeded." }, { status: 500 }));
  await form.submit();
  assert.equal(form.state[0], "Google Drive storage quota exceeded.");
  assert.equal(form.state[1], false);
});

test("upload form prompts to reconnect after refresh-token expiration", async () => {
  const form = uploadForm(async () => Response.json({ error: "Expired", reconnectRequired: true }, { status: 409 }));
  await form.submit();
  assert.equal(form.state[0], "reconnectRequired");
  assert.equal(form.state[6], true);
});

test("upload form submits the no-email preference and reports no email sent", async () => {
  let completedBody;
  const form = uploadForm(async (url, options) => {
    if (url.endsWith("/start")) return Response.json({ sessionUrl: "https://www.googleapis.com/upload/drive/test" });
    if (url.endsWith("/chunk")) return Response.json({ complete: true, id: "drive-file" });
    completedBody = JSON.parse(options.body);
    return Response.json({ id: "document", recipientCount: 1, emailCount: 0, emailFailureCount: 0 });
  }, false);
  await form.submit();
  assert.equal(completedBody.sendEmail, false);
  assert.deepEqual(completedBody.userIds, ["member"]);
  assert.equal(completedBody.isPublic, false);
  assert.equal(form.state[0], "published noEmailsSent");
});
