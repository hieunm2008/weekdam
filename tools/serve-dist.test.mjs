import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { request } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

test("server CLI accepts an isolated build directory and reports its assigned port", async () => {
  const directory = await mkdtemp(join(tmpdir(), "weekdam-static-cli-"));
  await writeFile(
    join(directory, "index.html"),
    "<title>isolated UI build</title>",
  );
  const child = spawn(
    process.execPath,
    ["tools/serve-dist.mjs", "--dir", directory, "--port", "0"],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  try {
    const address = await new Promise((resolve, reject) => {
      child.once("error", reject);
      child.stdout.once("data", (data) =>
        resolve(data.toString().trim().split(" ").at(-1)),
      );
      child.once("exit", (code) =>
        reject(new Error(`Server exited with ${code}`)),
      );
    });
    assert.notEqual(
      new URL(address).port,
      "0",
      "report the bound port, not the requested zero",
    );
    const response = await fetch(`${address}/pricing`);
    assert.equal(await response.text(), "<title>isolated UI build</title>");
  } finally {
    child.kill();
    await new Promise((resolve) => child.once("exit", resolve));
    await rm(directory, { recursive: true, force: true });
  }
});

test("production SPA server serves assets and routes without exposing parent files", async () => {
  assert.equal(
    existsSync(new URL("./serve-dist.mjs", import.meta.url)),
    true,
    "the production static server must exist",
  );
  const { createStaticServer } = await import("./serve-dist.mjs");
  const directory = await mkdtemp(join(tmpdir(), "weekdam-static-"));
  const root = join(directory, "dist");
  await mkdir(join(root, "assets"), { recursive: true });
  await writeFile(
    join(root, "index.html"),
    "<!doctype html><title>weekdam</title>",
  );
  await writeFile(join(root, "assets", "main.js"), "export const app = true;");
  await writeFile(
    join(root, "sw.js"),
    "self.addEventListener('fetch', () => {});",
  );
  await writeFile(join(root, "icon.svg"), "<svg/>");
  await writeFile(join(directory, "private.txt"), "must not escape dist");
  const server = createStaticServer(root);
  try {
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const port = server.address().port;
    const get = (path, method = "GET") =>
      new Promise((resolve, reject) => {
        const outgoing = request(
          { hostname: "127.0.0.1", port, path, method },
          (response) => {
            let body = "";
            response.setEncoding("utf8");
            response.on("data", (chunk) => {
              body += chunk;
            });
            response.on("end", () =>
              resolve({
                status: response.statusCode,
                headers: response.headers,
                body,
              }),
            );
          },
        );
        outgoing.on("error", reject);
        outgoing.end();
      });
    const spa = await get("/app?plan=year");
    assert.equal(spa.status, 200);
    assert.match(spa.headers["content-type"], /^text\/html/);
    assert.equal(spa.headers["cache-control"], "no-cache");
    assert.match(spa.body, /weekdam/);
    assert.equal((await get("/pricing")).status, 200);
    const script = await get("/assets/main.js");
    assert.equal(script.status, 200);
    assert.match(script.headers["content-type"], /javascript/);
    assert.equal((await get("/sw.js")).headers["cache-control"], "no-cache");
    assert.equal(
      (await get("/icon.svg")).headers["content-type"],
      "image/svg+xml",
    );
    assert.equal((await get("/assets/missing.js")).status, 404);
    assert.equal((await get("/%2e%2e%2fprivate.txt")).status, 403);
    assert.equal((await get("/%E0%A4%A")).status, 400);
    assert.equal((await get("/app", "POST")).status, 405);
    const head = await get("/app", "HEAD");
    assert.equal(head.status, 200);
    assert.equal(head.body, "");
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(directory, { recursive: true, force: true });
  }
});
