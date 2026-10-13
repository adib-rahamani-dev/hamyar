import { spawn } from "node:child_process";
if (!process.env.npm_execpath)
  throw new Error("Run this build with npm run build:self-host.");
const child = spawn(
  process.execPath,
  [process.env.npm_execpath, "run", "build"],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      HAMYAR_STANDALONE: "1",
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
);
child.on("error", () => {
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
