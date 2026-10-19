import { readFile, stat } from "node:fs/promises";
import { basename, extname } from "node:path";
import { pathToFileURL } from "node:url";

import type * as acp from "@agentclientprotocol/sdk";

export type AttachmentKind = "image" | "text" | "file";

/** A file picked or dropped into the composer; only its path is kept, the bytes are read when the message goes. */
export type Attachment = { readonly path: string; readonly name: string; readonly mime: string; readonly kind: AttachmentKind; readonly bytes: number };

const IMAGE_MIME: Readonly<Record<string, string>> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp" };

const TEXT_EXT = new Set([
  "txt", "md", "json", "log", "csv", "tsv", "xml", "yaml", "yml", "toml", "ini", "cfg", "conf", "plist", "entitlements", "strings", "env",
  "c", "h", "cpp", "cc", "hpp", "m", "mm", "swift", "java", "kt", "kts", "gradle", "py", "js", "ts", "tsx", "jsx", "mjs", "rs", "go", "rb", "php", "cs",
  "sh", "zsh", "bash", "fish", "ps1", "smali", "html", "css", "scss", "sql", "diff", "patch", "ll", "s", "asm", "ptx", "metal", "cu", "hlsl", "glsl", "wgsl", "proto", "pro",
]);

const IMAGE_MAX = 20 * 1024 * 1024;
const TEXT_MAX = 2 * 1024 * 1024;

function ext(path: string): string {
  return extname(path).slice(1).toLowerCase();
}

export function attachmentKind(path: string): AttachmentKind {
  const extension = ext(path);
  if (IMAGE_MIME[extension]) return "image";
  return TEXT_EXT.has(extension) ? "text" : "file";
}

/** Images and text files dropped on the composer attach to the message; anything else still opens as the file to study. */
export function canAttach(path: string): boolean {
  return attachmentKind(path) !== "file";
}

function mimeOf(path: string, kind: AttachmentKind): string {
  const extension = ext(path);
  if (kind === "image") return IMAGE_MIME[extension] ?? "application/octet-stream";
  if (kind === "text") return extension === "json" ? "application/json" : extension === "md" ? "text/markdown" : "text/plain";
  return "application/octet-stream";
}

export async function attachmentFor(path: string): Promise<Attachment> {
  const kind = attachmentKind(path);
  const info = await stat(path);
  return { path, name: basename(path), mime: mimeOf(path, kind), kind, bytes: info.size };
}

export function sizeLabel(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function link(file: Attachment): acp.ContentBlock {
  return { type: "resource_link", uri: pathToFileURL(file.path).href, name: file.name, mimeType: file.mime, size: file.bytes };
}

/** What each attachment becomes in the prompt: an image, the file's text, or a link the agent reads itself when it can't take the content. */
export async function promptBlocks(attachments: readonly Attachment[], can: acp.PromptCapabilities): Promise<readonly acp.ContentBlock[]> {
  return Promise.all(attachments.map(async (file): Promise<acp.ContentBlock> => {
    if (file.kind === "image" && can.image && file.bytes <= IMAGE_MAX) {
      return { type: "image", data: (await readFile(file.path)).toString("base64"), mimeType: file.mime, uri: pathToFileURL(file.path).href };
    }
    if (file.kind === "text" && can.embeddedContext && file.bytes <= TEXT_MAX) {
      return { type: "resource", resource: { uri: pathToFileURL(file.path).href, mimeType: file.mime, text: await readFile(file.path, "utf8") } };
    }
    return link(file);
  }));
}
