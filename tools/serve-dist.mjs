import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

// A small production-build host for browser tests; Vite preview does not bind
// reliably on the Windows test host. There is no connection to Firebase here.
export function createStaticServer(directory) {
  const root = resolve(directory);
  return createServer(async (request, response) => {
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, { Allow: "GET, HEAD" }).end();
      return;
    }
    let pathname;
    try {
      pathname = decodeURIComponent((request.url || "/").split("?")[0]);
      if (pathname.includes("\0")) throw new Error("Invalid path");
    } catch {
      response.writeHead(400).end();
      return;
    }
    let file = resolve(root, `.${pathname}`);
    const relativePath = relative(root, file);
    if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
      response.writeHead(403).end();
      return;
    }
    try {
      const info = await stat(file).catch(() => null);
      if (!info?.isFile()) {
        if (extname(pathname)) {
          response.writeHead(404).end();
          return;
        }
        file = resolve(root, "index.html");
      }
      const body = await readFile(file);
      response.writeHead(200, {
        "Content-Type":
          contentTypes[extname(file)] || "application/octet-stream",
        "Content-Length": body.length,
        "Cache-Control": "no-cache",
      });
      response.end(request.method === "HEAD" ? undefined : body);
    } catch {
      response.writeHead(404).end();
    }
  });
}

if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  const portArgument = process.argv.indexOf("--port");
  const port =
    portArgument >= 0 ? Number(process.argv[portArgument + 1]) : 4173;
  const directoryArgument = process.argv.indexOf("--dir");
  const root =
    directoryArgument >= 0
      ? resolve(process.argv[directoryArgument + 1])
      : fileURLToPath(new URL("../dist", import.meta.url));
  const server = createStaticServer(root);
  server.listen(port, "127.0.0.1", () => {
    console.log(`Production build: http://127.0.0.1:${server.address().port}`);
  });
  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => server.close(() => process.exit(0)));
  }
}
