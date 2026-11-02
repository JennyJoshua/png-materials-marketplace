import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Render pull-request preview safety", () => {
  const middleware = readFileSync("middleware.ts", "utf8");

  it("detects Render pull-request preview instances", () => {
    expect(middleware).toContain('process.env.IS_PULL_REQUEST === "true"');
  });

  it("rejects every non-read request in a pull-request preview", () => {
    expect(middleware).toContain('request.method !== "GET" && request.method !== "HEAD"');
    expect(middleware).toContain('code: "PREVIEW_READ_ONLY"');
    expect(middleware).toContain("{ status: 403 }");
  });

  it("does not expose authenticated workspaces or their APIs in previews", () => {
    for (const prefix of [
      '"/api/providers"',
      '"/api/admin"',
      '"/api/customer"',
      '"/api/supplier"',
      '"/login"',
      '"/register"',
    ]) {
      expect(middleware).toContain(prefix);
    }
    expect(middleware).toContain("roleForPath(pathname)");
  });

  it("avoids Supabase session refresh and profile synchronization in previews", () => {
    const previewBranch = middleware.slice(
      middleware.indexOf("if (isPullRequestPreview)"),
      middleware.indexOf("// Only protected application areas"),
    );
    expect(previewBranch).not.toContain("updateSession(request)");
    expect(previewBranch).not.toContain("getAppUser");
  });

  it("applies the preview guard to all application routes, including server actions", () => {
    expect(middleware).toContain('matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]');
  });
});
