import { expect, test } from "bun:test";

import { toolLabel } from "../src/agents/describe";

test("a shell command reads as its description", () => {
  const input = { command: "python3 -c \"\nimport onnx\nm.producer_name\n\"", description: "Parse ONNX graph, metadata and weights" };
  expect(toolLabel("python3 -c \"\nimport onnx\nm.producer_name", input)).toEqual({ label: "Parse ONNX graph, metadata and weights", detail: null, command: "python3 -c \"" });
});

test("a shell command without a description keeps its first line as the command", () => {
  expect(toolLabel("cd /tmp && ls", { command: "cd /tmp && ls\npwd" })).toEqual({ label: "Run a command", detail: null, command: "cd /tmp && ls" });
});

test("a command sent only as the title, with an empty input, is still the command", () => {
  expect(toolLabel("strings -n 3 hey_hermes.onnx | sort\nhead", {})).toEqual({ label: "Run a command", detail: null, command: "strings -n 3 hey_hermes.onnx | sort" });
});

test("the line an agent sends while a command runs becomes its label", () => {
  expect(toolLabel("dns-sd -B _services._dns-sd._udp local.", {}, "Browse all mDNS service types")).toEqual({ label: "Browse all mDNS service types", detail: null, command: "dns-sd -B _services._dns-sd._udp local." });
});

test("tool ids still read as words", () => {
  expect(toolLabel("mcp__eleven__set_view", {})).toEqual({ label: "Set view", detail: null, command: null });
  expect(toolLabel("procedure_pseudo_code", { procedure: "FUN_1" })).toEqual({ label: "Read pseudocode", detail: "FUN_1", command: null });
  expect(toolLabel("Terminal", {})).toEqual({ label: "Terminal", detail: null, command: null });
});
