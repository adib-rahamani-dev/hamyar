import { describe, expect, it } from "vitest";
import { publicDeploymentStatus } from "./deployment-status";

describe("public deployment summary", () => {
  it("uses actual deployment facts without turning unknown capacity into zero", () => {
    const result = publicDeploymentStatus(
      { VERCEL: "1", VERCEL_ENV: "production", VERCEL_REGION: "iad1" },
      "24.19.0",
    );
    expect(result).toMatchObject({
      hosting: "Vercel",
      region: "iad1",
      runtime: "Node.js 24",
      capacity: { remaining: null, used: null, limit: null },
    });
  });
  it("never serializes arbitrary environment variables or tenant data", () => {
    const result = publicDeploymentStatus(
      {
        DATABASE_URL: "private-secret",
        VERCEL_REGION: "<script>",
        VERCEL_ENV: "private-value",
      },
      "24.19.0",
    );
    expect(result.region).toBeNull();
    expect(JSON.stringify(result)).not.toContain("private");
    expect(JSON.stringify(result)).not.toContain("script");
  });
  it("rejects unknown environment and malformed region on Vercel", () => {
    expect(
      publicDeploymentStatus(
        { VERCEL: "1", VERCEL_ENV: "secret", VERCEL_REGION: "invalid" },
        "24",
      ),
    ).toMatchObject({ environment: "نامشخص", region: null });
  });
});
