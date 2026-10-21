import "./fixtures/isolate";
import { expect, test } from "bun:test";

import { customAgentEntry } from "../src/agents/registry";

function parts(command: string): { readonly command: string; readonly args: readonly string[] } {
  const entry = customAgentEntry(command);
  if (!entry || entry.distribution.kind !== "command") throw new Error(`no command for ${command}`);
  return { command: entry.distribution.command, args: entry.distribution.args };
}

test("splits a plain command into program and arguments", () => {
  expect(parts("my-agent --acp --port 7 ")).toEqual({ command: "my-agent", args: ["--acp", "--port", "7"] });
});

test("keeps a quoted path with spaces in one piece", () => {
  const entry = parts('"C:\\Program Files\\nodejs\\node.exe" "C:\\Program Files\\Eleven\\npx-cli.js" -y claude-agent-acp');
  expect(entry.command).toBe("C:\\Program Files\\nodejs\\node.exe");
  expect(entry.args).toEqual(["C:\\Program Files\\Eleven\\npx-cli.js", "-y", "claude-agent-acp"]);
});

test("accepts single quotes and mixed quoting", () => {
  expect(parts("'/opt/my agent/run' --acp \"two words\"")).toEqual({ command: "/opt/my agent/run", args: ["--acp", "two words"] });
});

test("leaves an unquoted command untouched and ignores blank input", () => {
  expect(parts("aster acp").args).toEqual(["acp"]);
  expect(customAgentEntry("   ")).toBeNull();
});
