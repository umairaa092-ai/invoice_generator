import { useRef, useState, type ChangeEvent } from "react";
import {
  AlertCircle,
  ArrowDownToLine,
  ArrowRight,
  CheckCircle2,
  Database,
  FileJson,
  History,
  Layers,
  ShieldCheck,
  Sparkles,
  Upload,
} from "lucide-react";
import { useWorkspace } from "../Workspace";
import { mergeWorkspace, parseBackup } from "../lib/backup";
import { today } from "../lib/calculations";
import type { Workspace } from "../lib/types";

const ROLLBACK_KEY = "billora.rollback.v1";

function counts(workspace: Workspace) {
  return (
    <div className="backup-summary">
      <div>
        <strong>{workspace.clients.length}</strong>
        <span>Clients</span>
      </div>
      <div>
        <strong>{workspace.invoices.length}</strong>
        <span>Invoices</span>
      </div>
      <div>
        <strong>{workspace.payments.length}</strong>
        <span>Payments</span>
      </div>
    </div>
  );
}

function readRollback(): Workspace | null {
  try {
    const snapshot = localStorage.getItem(ROLLBACK_KEY);
    return snapshot ? parseBackup(snapshot) : null;
  } catch {
    return null;
  }
}

export default function Backup() {
  const { data, commit, toast, confirm, loadDemo, storageError } =
    useWorkspace();
  const [staged, setStaged] = useState<{
    workspace: Workspace;
    filename: string;
  } | null>(null);
  const [mode, setMode] = useState<"merge" | "replace">("merge");
  const [rollback, setRollback] = useState<Workspace | null>(readRollback);
  const [reading, setReading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  function download() {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `billora-backup-${today()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("Backup downloaded. Keep it somewhere safe.");
  }

  async function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 10 * 1024 * 1024)
      return toast(
        "This file is too large. Choose a Billora JSON backup under 10 MB.",
        "error",
      );
    setReading(true);
    setStaged(null);
    try {
      const workspace = parseBackup(await file.text());
      setStaged({ workspace, filename: file.name });
      setMode("merge");
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : "This backup could not be read. Your current workspace has not changed.",
        "error",
      );
    } finally {
      setReading(false);
    }
  }

  function applyRestore() {
    if (!staged) return;
    const imported = staged.workspace;
    confirm({
      title:
        mode === "merge" ? "Merge this backup?" : "Replace your workspace?",
      message:
        mode === "merge"
          ? "Current records will remain. Missing backup records will be added, and newer records take priority when IDs match. Your current workspace will be saved so you can undo this restore."
          : `This will replace your current ${data.clients.length} clients, ${data.invoices.length} invoices, and ${data.payments.length} payments with the backup, including its business settings. A rollback snapshot will be saved so you can undo this restore.`,
      confirmLabel: mode === "merge" ? "Merge backup" : "Replace workspace",
      onConfirm: () => {
        let next: Workspace;
        try {
          next = mode === "merge" ? mergeWorkspace(data, imported) : imported;
        } catch (error) {
          toast(
            error instanceof Error
              ? error.message
              : "The backup could not be merged. Your workspace has not changed.",
            "error",
          );
          return;
        }
        let previousSnapshot: string | null;
        try {
          previousSnapshot = localStorage.getItem(ROLLBACK_KEY);
          localStorage.setItem(ROLLBACK_KEY, JSON.stringify(data));
        } catch {
          toast(
            "There is not enough browser storage to save a rollback snapshot. Download a backup and free up storage before restoring. Your workspace has not changed.",
            "error",
          );
          return;
        }
        if (
          commit(
            next,
            mode === "merge"
              ? "Backup merged. Your workspace is up to date."
              : "Workspace restored from backup.",
            !!storageError,
          )
        ) {
          setRollback(data);
          setStaged(null);
        } else {
          try {
            if (previousSnapshot === null)
              localStorage.removeItem(ROLLBACK_KEY);
            else localStorage.setItem(ROLLBACK_KEY, previousSnapshot);
          } catch {
            setRollback(readRollback());
          }
        }
      },
    });
  }

  function undoRestore() {
    const snapshot = readRollback();
    if (!snapshot) {
      setRollback(null);
      toast("No valid rollback snapshot is available.", "error");
      return;
    }
    confirm({
      title: "Undo the last restore?",
      message:
        "Your workspace will return to the snapshot saved immediately before the last merge or replace. Changes made since that restore will be removed. Download a backup first to keep those changes.",
      confirmLabel: "Undo restore",
      onConfirm: () => {
        if (
          commit(
            snapshot,
            "Last restore undone. Your previous workspace is back.",
          )
        ) {
          try {
            localStorage.removeItem(ROLLBACK_KEY);
            setRollback(null);
          } catch {
            toast(
              "Workspace restored, but the rollback snapshot could not be cleared.",
              "error",
            );
          }
          setStaged(null);
        }
      },
    });
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">A LITTLE BACKUP GOES A LONG WAY</p>
          <h1>Backup & restore</h1>
          <p>
            Your records, safely in your hands. Pick up wherever you left off.
          </p>
        </div>
        <span className="settings-local-note">
          <ShieldCheck size={16} /> You own your data
        </span>
      </div>
      <div className="backup-grid">
        <section className="panel backup-card">
          <span className="backup-icon">
            <ArrowDownToLine size={23} />
          </span>
          <h2>Keep a safe copy</h2>
          <p>
            Download your clients, invoices, payments, and business settings in
            a single JSON file.
          </p>
          {counts(data)}
          <button className="btn btn-primary" onClick={download}>
            <ArrowDownToLine size={17} />
            Download backup
          </button>
          <span className="backup-footnote">
            A good habit: back up after a busy week.
          </span>
        </section>
        <section className="panel backup-card">
          <span className="backup-icon">
            <Upload size={23} />
          </span>
          <h2>Bring your records back</h2>
          <p>
            Choose a Billora backup to review. Your data stays as it is until
            you confirm a restore.
          </p>
          <input
            ref={fileInput}
            type="file"
            accept=".json,application/json"
            hidden
            aria-label="Select a Billora JSON backup"
            onChange={selectFile}
          />
          <button
            className="upload-zone"
            onClick={() => fileInput.current?.click()}
            disabled={reading}
          >
            <FileJson size={26} />
            <strong>
              {reading ? "Reading your backup…" : "Choose a JSON backup"}
            </strong>
            <span>Click to browse · up to 10 MB</span>
          </button>
        </section>
      </div>
      {staged && (
        <section className="panel restore-panel">
          <div className="panel-heading">
            <CheckCircle2 size={21} className="text-success" />
            <div>
              <h2>Backup ready to review</h2>
              <p>{staged.filename}</p>
            </div>
            <button
              className="btn btn-secondary btn-small"
              onClick={() => setStaged(null)}
            >
              Cancel
            </button>
          </div>
          <div className="restore-comparison">
            <div>
              <h3>Current workspace</h3>
              {counts(data)}
            </div>
            <ArrowRight size={20} />
            <div>
              <h3>Backup file</h3>
              {counts(staged.workspace)}
            </div>
          </div>
          <fieldset className="restore-options">
            <legend>How would you like to restore?</legend>
            <label
              className={`restore-option ${mode === "merge" ? "selected" : ""}`}
            >
              <input
                type="radio"
                name="restore-mode"
                checked={mode === "merge"}
                onChange={() => setMode("merge")}
              />
              <Layers size={20} />
              <div>
                <strong>
                  Merge with current data{" "}
                  <span className="recommended-label">Recommended</span>
                </strong>
                <p>
                  Keep your current records and add missing records from the
                  backup. Newer records take priority when IDs match. Your
                  current business settings stay.
                </p>
              </div>
            </label>
            <label
              className={`restore-option ${mode === "replace" ? "selected" : ""}`}
            >
              <input
                type="radio"
                name="restore-mode"
                checked={mode === "replace"}
                onChange={() => setMode("replace")}
              />
              <Database size={20} />
              <div>
                <strong>Replace current workspace</strong>
                <p>
                  Use the backup as your entire workspace, including its
                  business settings. Current records will be replaced.
                </p>
              </div>
            </label>
          </fieldset>
          {mode === "replace" && (
            <div className="restore-warning" role="status">
              <AlertCircle size={18} />
              <p>
                Replacing removes the records currently on this device. Download
                a backup first if you want to keep a separate copy.
              </p>
            </div>
          )}
          <div className="form-actions">
            <span className="backup-footnote">
              <ShieldCheck size={15} />
              An undo snapshot is saved before restoring.
            </span>
            <button
              className={`btn ${mode === "merge" ? "btn-primary" : "btn-danger"}`}
              onClick={applyRestore}
            >
              {mode === "merge" ? "Merge backup" : "Replace workspace"}
              <ArrowRight size={16} />
            </button>
          </div>
        </section>
      )}
      <div className="backup-grid backup-secondary-grid">
        <section className="panel backup-card compact">
          <span className="backup-icon">
            <History size={22} />
          </span>
          <h2>A way back, just in case</h2>
          <p>
            {rollback
              ? "A snapshot from before your last restore is available, even after reloading this browser."
              : "After a merge or replace, you can return to the workspace you had before restoring."}
          </p>
          <button
            className="btn btn-secondary"
            onClick={undoRestore}
            disabled={!rollback}
          >
            <History size={17} />
            Undo last restore
          </button>
        </section>
        <section className="panel backup-card compact">
          <span className="backup-icon">
            <Sparkles size={22} />
          </span>
          <h2>Take Billora for a spin</h2>
          <p>
            Explore a sample workspace with clients, invoices, and payments.
            You’ll review a confirmation before any records change.
          </p>
          <button className="btn btn-secondary" onClick={loadDemo}>
            <Sparkles size={17} />
            Load demo workspace
          </button>
        </section>
      </div>
      <div className="local-data-notice">
        <ShieldCheck size={18} />
        <p>
          Billora stores data in this browser on this device. Clearing browser
          data removes your records. Keep an exported backup before clearing
          storage or moving to a different device.
        </p>
      </div>
    </>
  );
}
