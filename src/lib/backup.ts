import type { Workspace } from "./types";
import { ValidationError, validateWorkspace } from "./validation";

/** Validate first; never modify the active workspace while reading a file. */
export function parseBackup(text: string): Workspace {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new ValidationError(
      "This file is not valid JSON. Choose a Billora JSON backup.",
    );
  }
  validateWorkspace(value);
  return value;
}

function mergeRecords<T extends { id: string; updatedAt: string }>(
  current: T[],
  incoming: T[],
): T[] {
  const records = new Map(current.map((record) => [record.id, record]));
  for (const record of incoming) {
    const existing = records.get(record.id);
    if (
      !existing ||
      Date.parse(record.updatedAt) > Date.parse(existing.updatedAt)
    ) {
      records.set(record.id, record);
    }
  }
  return [...records.values()];
}

/** Current settings survive merges; backup branding can fill fields that are still empty. */
export function mergeWorkspace(
  current: Workspace,
  incoming: Workspace,
): Workspace {
  validateWorkspace(current);
  validateWorkspace(incoming);
  const merged: Workspace = {
    version: 1,
    clients: mergeRecords(current.clients, incoming.clients),
    invoices: mergeRecords(current.invoices, incoming.invoices),
    payments: mergeRecords(current.payments, incoming.payments),
    settings: { ...current.settings },
  };
  for (const field of [
    "businessName",
    "businessLogo",
    "businessTagline",
    "invoiceAccentColor",
  ] as const) {
    const existing = current.settings[field];
    const imported = incoming.settings[field];
    if (!existing?.trim() && imported?.trim()) {
      merged.settings[field] = imported;
    }
  }
  try {
    validateWorkspace(merged);
  } catch (error) {
    const reason =
      error instanceof Error
        ? error.message
        : "The merged records are inconsistent.";
    throw new ValidationError(
      `Unable to merge this backup safely: ${reason} Your current workspace is unchanged.`,
    );
  }
  // Keep callers from accidentally editing records in the original workspace or imported preview.
  return JSON.parse(JSON.stringify(merged)) as Workspace;
}
