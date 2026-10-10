import sharp from "sharp";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const source = await readFile(new URL("../public/icon.svg", import.meta.url));
for (const size of [192, 512]) {
  await sharp(source)
    .resize(size, size)
    .png()
    .toFile(
      fileURLToPath(new URL(`../public/icon-${size}.png`, import.meta.url)),
    );
}
console.log("PWA icons rendered from the original weekdam SVG");
