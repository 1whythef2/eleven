import { expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { attachmentFor, attachmentKind, canAttach, promptBlocks, sizeLabel } from "../src/agents/attachments";

const dir = mkdtempSync(join(tmpdir(), "eleven-attach-"));
const png = join(dir, "shot.PNG");
const notes = join(dir, "notes.md");
writeFileSync(png, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
writeFileSync(notes, "# Notes\nhello");

test("attachments: images and text attach on drop, binaries still open as the file to study", () => {
  expect(attachmentKind("/a/shot.PNG")).toBe("image");
  expect(attachmentKind("/a/main.swift")).toBe("text");
  expect(attachmentKind("/a/libfoo.dylib")).toBe("file");
  expect(canAttach("/a/shot.png")).toBe(true);
  expect(canAttach("/a/Calculator.app")).toBe(false);
  expect(sizeLabel(8)).toBe("8 B");
  expect(sizeLabel(3 * 1024 * 1024)).toBe("3.0 MB");
});

test("attachments: an agent that takes images and context gets the picture and the text itself", async () => {
  const files = [await attachmentFor(png), await attachmentFor(notes)];
  expect(files[0]).toEqual({ path: png, name: "shot.PNG", mime: "image/png", kind: "image", bytes: 8 });
  const blocks = await promptBlocks(files, { image: true, embeddedContext: true });
  expect(blocks[0]).toEqual({ type: "image", data: "iVBORw0KGgo=", mimeType: "image/png", uri: `file://${png}` });
  expect(blocks[1]).toEqual({ type: "resource", resource: { uri: `file://${notes}`, mimeType: "text/markdown", text: "# Notes\nhello" } });
});

test("attachments: an agent without those abilities gets links it can read on its own", async () => {
  const blocks = await promptBlocks([await attachmentFor(png), await attachmentFor(notes)], {});
  expect(blocks.map((block) => block.type)).toEqual(["resource_link", "resource_link"]);
  expect(blocks[0]).toMatchObject({ type: "resource_link", name: "shot.PNG", mimeType: "image/png", size: 8 });
});
