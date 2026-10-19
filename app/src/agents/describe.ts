import { stringField } from "../lib/guards";
import { reaToolName } from "./permissions";

const LABELS: Readonly<Record<string, readonly [label: string, arg?: string]>> = {
  procedure_pseudo_code: ["Read pseudocode", "procedure"],
  procedure_assembly: ["Read assembly", "procedure"],
  procedure_callers: ["Found who calls", "procedure"],
  procedure_callees: ["Found what it calls", "procedure"],
  procedure_info: ["Read function details", "procedure"],
  analyze_function: ["Studied a function", "procedure"],
  open_binary: ["Opened the file", "path"],
  binary_overview: ["Read the overview"],
  binary_session: ["Checked the session"],
  list_procedures: ["Listed functions"],
  list_strings: ["Listed strings"],
  list_segments: ["Listed segments"],
  search_strings: ["Searched strings", "pattern"],
  search_procedures: ["Searched functions", "pattern"],
  find_code_for_string: ["Found code using a string", "string"],
  xrefs: ["Found references", "address"],
  ToolSearch: ["Looked up its tools"],
};

/** The same tools while they run, for a live status line: "Reading assembly" rather than "Read assembly". */
const DOING: Readonly<Record<string, string>> = {
  procedure_pseudo_code: "Reading pseudocode",
  procedure_assembly: "Reading assembly",
  procedure_callers: "Finding who calls",
  procedure_callees: "Finding what it calls",
  procedure_info: "Reading function details",
  analyze_function: "Studying a function",
  open_binary: "Opening the file",
  binary_overview: "Reading the overview",
  binary_session: "Checking the session",
  list_procedures: "Listing functions",
  list_strings: "Listing strings",
  list_segments: "Listing segments",
  search_strings: "Searching strings",
  search_procedures: "Searching functions",
  find_code_for_string: "Finding code using a string",
  xrefs: "Finding references",
  ToolSearch: "Looking up its tools",
};

/** `command` is the shell line a call ran, kept apart from `detail` so it can be drawn in the code font. */
export type ToolLabel = { readonly label: string; readonly detail: string | null; readonly command: string | null };

/** True for a tool id like procedure_pseudo_code or mcp__eleven__set_view, false for a shell line sent as the title. */
export function isToolId(name: string): boolean {
  return /^[\w.-]+$/.test(name);
}

function humanize(name: string): string {
  const label = name.replace(/^mcp__[^_]+__/, "").replace(/_/g, " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function firstLine(text: string): string {
  return text.trim().split("\n")[0] ?? text;
}

function shortPath(value: string): string {
  return value.includes("/") ? (value.split("/").pop() ?? value) : value;
}

/**
 * Splits a raw tool call into the bold label and the grey detail people read.
 * Some agents send a shell command as the title with an empty input, so the title counts as the command too.
 */
export function toolLabel(tool: string, input: unknown, summary: string | null = null): ToolLabel {
  const command = stringField(input, "command") ?? (isToolId(tool.trim()) ? undefined : tool);
  if (command !== undefined) {
    const description = stringField(input, "description")?.trim() || summary;
    return { label: description || "Run a command", detail: null, command: firstLine(command) };
  }
  const name = reaToolName(tool) ?? tool;
  const known = LABELS[name];
  if (!known) return { label: humanize(name), detail: null, command: null };
  const [label, key] = known;
  const value = key ? stringField(input, key) : undefined;
  return { label, detail: value ? shortPath(value) : null, command: null };
}

export function describe(tool: string, input: unknown): string {
  const { label, detail, command } = toolLabel(tool, input);
  const rest = detail ?? (label === "Run a command" ? command : null);
  return rest ? `${label} · ${rest}` : label;
}

/** What a running tool is doing right now, like "Reading assembly · FUN_100002404". */
export function doing(tool: string, input: unknown): string {
  const { label, detail, command } = toolLabel(tool, input);
  const now = DOING[reaToolName(tool) ?? tool] ?? (label === "Run a command" ? "Running a command" : label);
  const rest = detail ?? (label === "Run a command" ? command : null);
  return rest ? `${now} · ${rest}` : now;
}
