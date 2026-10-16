import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
// Images must already exist locally. This command NEVER pulls, installs or copies private env/data.
const images = process.argv.slice(2);
if (
  images.length < 5 ||
  images.some(
    (image) => !/^[a-zA-Z0-9/._:@-]+$/.test(image) || !image.includes(":"),
  )
)
  throw Error(
    "Pass pinned web, migration, gateway, postgres and LiveKit image tags (plus any proxy/worker images).",
  );
function run(binary, args, output = false) {
  return new Promise((accept, reject) => {
    const child = spawn(binary, args, {
      shell: false,
      windowsHide: true,
      stdio: ["ignore", output ? "pipe" : "inherit", "inherit"],
    });
    let text = "";
    child.stdout?.on("data", (chunk) => {
      text += chunk;
    });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0
        ? accept(text.trim())
        : reject(Error(`${binary} failed (${code})`)),
    );
  });
}
if (await run("git", ["status", "--porcelain"], true))
  throw Error("Commit the reviewed release before exporting it.");
const revision = await run("git", ["rev-parse", "HEAD"], true);
const inspected = [];
for (const image of images)
  inspected.push(
    JSON.parse(await run("docker", ["image", "inspect", image], true))[0],
  );
const target = resolve(".artifacts", `offline-${revision.slice(0, 12)}`);
await mkdir(target, { recursive: false });
await run("git", [
  "archive",
  "--format=tar",
  `--output=${resolve(target, "source.tar")}`,
  revision,
]);
await run("docker", [
  "image",
  "save",
  "--output",
  resolve(target, "images.tar"),
  ...images,
]);
const files = {};
// Stream large images; avoid loading the archive into the operator's RAM.
const { createReadStream } = await import("node:fs");
for (const name of ["source.tar", "images.tar"]) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(resolve(target, name)))
    hash.update(chunk);
  files[name] = hash.digest("hex");
}
const packageInfo = JSON.parse(await readFile("package.json", "utf8"));
await writeFile(
  resolve(target, "manifest.json"),
  JSON.stringify(
    {
      revision,
      appVersion: packageInfo.version,
      builtAt: new Date().toISOString(),
      images: inspected.map((item, index) => ({
        tag: images[index],
        id: item.Id,
        digests: item.RepoDigests,
        architecture: item.Architecture,
        os: item.Os,
      })),
      files,
      privateDataIncluded: false,
    },
    null,
    2,
  ),
);
console.log(
  `Offline archive created at ${target}. TLS, private env and encrypted backups must be prepared separately.`,
);
