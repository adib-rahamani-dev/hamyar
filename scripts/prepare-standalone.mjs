import { access, cp } from "node:fs/promises";
const standalone = new URL("../.next/standalone/", import.meta.url);
await access(new URL("server.js", standalone));
await cp(
  new URL("../.next/static/", import.meta.url),
  new URL(".next/static/", standalone),
  { recursive: true },
);
