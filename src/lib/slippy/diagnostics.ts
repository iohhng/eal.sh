import type { Diagnostic, Severity } from "./model";

export function diagnostic(severity: Severity, message: string, slipKey?: string): Diagnostic {
  return { severity, message, slipKey };
}

export function failOnErrors(diagnostics: Diagnostic[]): void {
  const errors = diagnostics.filter((item) => item.severity === "error");
  if (!errors.length) return;

  throw new Error(
    errors.map((item) => `${item.slipKey ? `${item.slipKey}: ` : ""}${item.message}`).join("\n"),
  );
}
