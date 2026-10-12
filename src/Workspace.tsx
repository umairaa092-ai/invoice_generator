import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { CheckCircle2, AlertCircle, X, Trash2, Download } from "lucide-react";
import type { Invoice, Workspace } from "./lib/types";
import { loadWorkspace, saveWorkspace } from "./lib/storage";
import { demoWorkspace, emptyWorkspace } from "./lib/seed";
import { parseBackup } from "./lib/backup";
import { Modal } from "./components/Modal";
export type Page =
  "dashboard" | "invoices" | "clients" | "payments" | "settings" | "backup";
type Confirmation = {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
};
type Context = {
  data: Workspace;
  commit: (next: Workspace, message: string, recover?: boolean) => boolean;
  toast: (message: string, type?: "success" | "error") => void;
  confirm: (options: Confirmation) => void;
  openPayment: (invoiceId?: string) => void;
  openInvoice: (invoice?: Invoice, duplicate?: boolean) => void;
  setPage: (page: Page) => void;
  loadDemo: () => void;
  demo: boolean;
  clearWorkspace: () => void;
  storageError?: string;
};
function demoMarker(value?: boolean) {
  try {
    if (value === undefined)
      return localStorage.getItem("billora.demo") === "true";
    if (value) localStorage.setItem("billora.demo", "true");
    else localStorage.removeItem("billora.demo");
  } catch {
    /* This optional display marker never controls record persistence. */
  }
  return false;
}
const WorkspaceContext = createContext<Context | null>(null);
export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error("Workspace provider missing");
  return context;
}
export function WorkspaceProvider({
  children,
  openPayment,
  openInvoice,
  setPage,
}: {
  children: ReactNode;
  openPayment: Context["openPayment"];
  openInvoice: Context["openInvoice"];
  setPage: Context["setPage"];
}) {
  const [initial] = useState(() => {
    const loaded = loadWorkspace();
    if (!loaded.error && !localStorage.getItem("billora.workspace.v1")) {
      const sample = demoWorkspace();
      try {
        saveWorkspace(sample);
        demoMarker(true);
        return { data: sample, isDemo: true, error: undefined };
      } catch {
        return {
          data: loaded.data,
          isDemo: false,
          error:
            "Browser storage is unavailable. Enable storage to save your workspace.",
        };
      }
    }
    return {
      ...loaded,
      isDemo: loaded.data.clients.some((client) =>
        client.id.startsWith("demo-client-"),
      ),
    };
  });
  const [data, setData] = useState(initial.data);
  const dataRef = useRef(data);
  dataRef.current = data;
  const [storageError, setStorageError] = useState(initial.error);
  const [demo, setDemo] = useState(initial.isDemo);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [toasts, setToasts] = useState<
    { id: number; message: string; type: "success" | "error" }[]
  >([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => {
    document.documentElement.dataset.theme = data.settings.theme;
  }, [data.settings.theme]);
  function toast(message: string, type: "success" | "error" = "success") {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-3), { id, message, type }]);
    timers.current.push(
      setTimeout(
        () => setToasts((t) => t.filter((item) => item.id !== id)),
        type === "error" ? 8000 : 4500,
      ),
    );
  }
  function commit(next: Workspace, message: string, recover = false) {
    if (storageError && !recover) {
      toast(
        "Recover or reset the unreadable workspace before saving new records.",
        "error",
      );
      return false;
    }
    try {
      parseBackup(JSON.stringify(next));
      const latest = localStorage.getItem("billora.workspace.v1");
      if (
        !storageError &&
        latest &&
        latest !== JSON.stringify(dataRef.current)
      ) {
        toast(
          "This workspace changed in another tab. Reload before saving to protect those changes.",
          "error",
        );
        return false;
      }
      if (storageError && latest)
        localStorage.setItem("billora.corrupt-recovery.v1", latest);
      saveWorkspace(next);
      setData(next);
      const hasSamples = next.clients.some((client) =>
        client.id.startsWith("demo-client-"),
      );
      demoMarker(hasSamples);
      setDemo(hasSamples);
      setStorageError(undefined);
      toast(message);
      return true;
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : "Could not save. Your previous data is unchanged.",
        "error",
      );
      return false;
    }
  }
  function clearWorkspace() {
    setConfirmation({
      title: storageError
        ? "Reset unreadable workspace?"
        : "Start with a clean workspace?",
      message:
        "This removes every client, invoice, and payment from this browser. Download a backup first if you need to keep them.",
      confirmLabel: "Start fresh",
      onConfirm: () => {
        try {
          const next = emptyWorkspace();
          next.settings = data.settings;
          if (storageError) {
            const raw = localStorage.getItem("billora.workspace.v1");
            if (raw) localStorage.setItem("billora.corrupt-recovery.v1", raw);
          }
          saveWorkspace(next);
          demoMarker(false);
          setData(next);
          setDemo(false);
          setStorageError(undefined);
          toast("Your clean workspace is ready");
        } catch {
          toast("Browser storage is unavailable.", "error");
        }
      },
    });
  }
  function loadDemo() {
    setConfirmation({
      title: "Load the demo workspace?",
      message:
        "Sample clients, invoices, and payments will replace this workspace. Download a backup first to keep your current records.",
      confirmLabel: "Load demo",
      onConfirm: () => {
        if (commit(demoWorkspace(), "Demo workspace loaded")) {
          demoMarker(true);
          setDemo(true);
        }
      },
    });
  }
  return (
    <WorkspaceContext.Provider
      value={{
        data,
        commit,
        toast,
        confirm: setConfirmation,
        openPayment,
        openInvoice,
        setPage,
        loadDemo,
        demo,
        clearWorkspace,
        storageError,
      }}
    >
      {storageError && (
        <div className="storage-alert" role="alert">
          <AlertCircle size={20} />
          <span>{storageError} Existing storage has been preserved.</span>
          <button
            className="btn btn-small btn-secondary"
            onClick={() => {
              try {
                const raw = localStorage.getItem("billora.workspace.v1") || "";
                const link = document.createElement("a");
                link.href = URL.createObjectURL(
                  new Blob([raw], { type: "application/json" }),
                );
                link.download =
                  "cellspray-invoice-payment-tracker-recovery.json";
                link.click();
                setTimeout(() => URL.revokeObjectURL(link.href), 1000);
              } catch {
                toast(
                  "Browser storage cannot be accessed. Enable storage and reload to recover your records.",
                  "error",
                );
              }
            }}
          >
            <Download size={15} />
            Download original
          </button>
          <button className="btn btn-small btn-danger" onClick={clearWorkspace}>
            Reset
          </button>
        </div>
      )}
      {children}
      {confirmation && (
        <Modal title={confirmation.title} onClose={() => setConfirmation(null)}>
          <div className="confirm-dialog">
            <span className="confirm-icon">
              <Trash2 size={25} />
            </span>
            <p>{confirmation.message}</p>
            <div className="form-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setConfirmation(null)}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={() => {
                  const action = confirmation.onConfirm;
                  setConfirmation(null);
                  action();
                }}
              >
                {confirmation.confirmLabel || "Delete"}
              </button>
            </div>
          </div>
        </Modal>
      )}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            {t.type === "success" ? (
              <CheckCircle2 size={19} />
            ) : (
              <AlertCircle size={19} />
            )}
            <span>{t.message}</span>
            <button
              className="icon-btn"
              aria-label="Dismiss notification"
              onClick={() => setToasts((v) => v.filter((x) => x.id !== t.id))}
            >
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
    </WorkspaceContext.Provider>
  );
}
