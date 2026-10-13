import { expect, test } from "vitest";
import { localDemoEnabled } from "./local-demo";
test("fixtures cannot appear on Vercel or in production even when explicitly requested", () => {
  expect(
    localDemoEnabled({ NODE_ENV: "development", HAMYAR_LOCAL_DEMOS: "1" }),
  ).toBe(true);
  for (const env of [
    {},
    { NODE_ENV: "development" },
    { NODE_ENV: "production", HAMYAR_LOCAL_DEMOS: "1" },
    { NODE_ENV: "development", VERCEL: "1", HAMYAR_LOCAL_DEMOS: "1" },
  ])
    expect(localDemoEnabled(env)).toBe(false);
});
