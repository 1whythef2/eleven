import { afterAll, beforeAll, expect, test } from "bun:test";
import { type ReactElement, useState } from "react";

import { MessageView } from "../src/chat/MessageView";
import type { Message } from "../src/chat/thread";
import { DARK, ThemeContext } from "../src/theme";
import { Screen } from "./harness";

const COMMAND = "dns-sd -B _services._dns-sd._udp local. > /tmp/m1.txt 2>&1 & P=$!; sleep 4; kill $P 2>/dev/null";
const RESULT = "```console\n_airplay._tcp.local.\n_raop._tcp.local.\n_companion-link._tcp.local.\n```";

const TURN: Message = {
  kind: "agent",
  startedAt: 0,
  endedAt: 2000,
  outcome: "done",
  blocks: [
    { kind: "tool", step: { id: "a", tool: COMMAND, toolKind: "execute", input: {}, summary: "Browse all mDNS service types on the LAN", output: RESULT, status: "done", startedAt: 1000, endedAt: 1157 } },
    { kind: "tool", step: { id: "b", tool: "which nmap", toolKind: "execute", input: {}, summary: null, output: "```\nExit code 1\nnmap not found\n```", status: "failed", startedAt: 1000, endedAt: 1200 } },
    { kind: "text", text: "Only AirPlay and RAOP answer." },
  ],
};

function Chat(): ReactElement {
  const [opened, setOpened] = useState("nothing");
  const actions = { onAnswer: () => {}, onRetry: () => {}, onOpen: () => {}, onOpenText: (title: string, text: string) => setOpened(`${title}: ${text.split("\n").length} lines`) };
  return (
    <ThemeContext.Provider value={{ p: DARK, appearance: "Dark", setAppearance: () => {} }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 24, width: 700 }}>
        <MessageView message={TURN} agentName="Claude" last actions={actions} />
        <div>{`Opened ${opened}`}</div>
      </div>
    </ThemeContext.Provider>
  );
}

let screen: Screen;

beforeAll(() => {
  screen = new Screen().render(<Chat />);
});

afterAll(() => screen.unmount());

test("tool step: a command reads as the agent's description with the command beside it, no badges from its output", async () => {
  await screen.until(() => screen.text().includes("Worked through 2 steps in 2s"), 5_000);
  screen.clickLabel("Worked through 2 steps in 2s");
  await screen.until(() => screen.text().includes("Browse all mDNS service types on the LAN"), 5_000);
  expect(screen.text()).toContain("dns-sd -B _services._dns-sd._udp local.");
  expect(screen.text()).not.toContain("Tool");
  expect(screen.text()).not.toContain("_airplay._tcp.local.");
});

test("tool step: a failed command shows its first real line, not a code fence", () => {
  expect(screen.text()).toContain("Exit code 1");
  expect(screen.text()).not.toContain("```");
});

test("tool step: opening a step shows the command as IN and the result without fences, and OUT opens the whole result", async () => {
  screen.clickLabel("Show what it sent and got back");
  await screen.until(() => screen.text().includes("_airplay._tcp.local."), 5_000);
  expect(screen.text()).not.toContain("{}");
  expect(screen.text()).not.toContain("```");
  screen.clickLabel("Open the whole result in a tab");
  await screen.until(() => screen.text().includes("Opened Browse all mDNS service types on the LAN: 3 lines"), 5_000);
});
