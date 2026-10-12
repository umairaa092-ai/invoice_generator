import { parseBackup } from "./backup";
import { emptyWorkspace } from "./seed";
import type { Workspace } from "./types";
import { validateWorkspace } from "./validation";

export const STORAGE_KEY = "billora.workspace.v1";

export function loadWorkspace(): { data: Workspace; error?: string } {
  try {
    if (typeof localStorage === "undefined") return { data: emptyWorkspace() };
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return { data: emptyWorkspace() };
    return { data: parseBackup(raw) };
  } catch {
    // Preserve the original bytes so the user can download/recover them before choosing a reset.
    return {
      data: emptyWorkspace(),
      error:
        "Your saved workspace could not be opened. It has been preserved. Download a copy before resetting or restoring a valid backup.",
    };
  }
}

export function saveWorkspace(data: Workspace): void {
  validateWorkspace(data);
  try {
    if (typeof localStorage === "undefined")
      throw new Error("Local storage is unavailable.");
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    throw new Error(
      "Your changes could not be saved. Browser storage may be full or unavailable. Download a backup and try again.",
    );
  }
}
