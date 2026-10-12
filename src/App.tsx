import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  FileText,
  Users,
  Wallet,
  Settings as SettingsIcon,
  DatabaseBackup,
  Plus,
  Moon,
  Sun,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  ShieldCheck,
  ArrowUpRight,
  Printer,
  Sparkles,
} from "lucide-react";
import { WorkspaceProvider, useWorkspace, type Page } from "./Workspace";
import type { Currency, Invoice } from "./lib/types";
import { currencies } from "./lib/calculations";
import Dashboard from "./pages/Dashboard";
import Invoices from "./pages/Invoices";
import Clients from "./pages/Clients";
import Payments from "./pages/Payments";
import Settings from "./pages/Settings";
import Backup from "./pages/Backup";
import { InvoiceEditor } from "./pages/InvoiceEditor";
import { PaymentEditor } from "./components/PaymentEditor";
import { InvoicePreview } from "./components/InvoicePreview";
import { Modal } from "./components/Modal";
const navigation = [
  { id: "dashboard" as Page, label: "Overview", icon: LayoutDashboard },
  { id: "invoices" as Page, label: "Invoices", icon: FileText },
  { id: "clients" as Page, label: "Clients", icon: Users },
  { id: "payments" as Page, label: "Payments", icon: Wallet },
];
export default function App() {
  const [page, setPage] = useState<Page>("dashboard");
  const [editor, setEditor] = useState<{
      invoice?: Invoice;
      duplicate?: boolean;
    } | null>(null),
    [payment, setPayment] = useState<{ invoiceId?: string } | null>(null),
    [print, setPrint] = useState<Invoice | null>(null);
  return (
    <WorkspaceProvider
      openInvoice={(invoice, duplicate) => setEditor({ invoice, duplicate })}
      openPayment={(invoiceId) => setPayment({ invoiceId })}
      setPage={setPage}
    >
      <Shell page={page} setPage={setPage} onPrint={setPrint} />
      {editor && (
        <InvoiceEditor
          key={editor.invoice?.id || "new"}
          original={editor.invoice}
          duplicate={editor.duplicate}
          onClose={() => setEditor(null)}
        />
      )}{" "}
      {payment && (
        <PaymentEditor
          invoiceId={payment.invoiceId}
          onClose={() => setPayment(null)}
        />
      )}{" "}
      {print && <PrintInvoice invoice={print} onClose={() => setPrint(null)} />}
    </WorkspaceProvider>
  );
}
function Shell({
  page,
  setPage,
  onPrint,
}: {
  page: Page;
  setPage: (page: Page) => void;
  onPrint: (invoice: Invoice) => void;
}) {
  const { data, commit, openInvoice, demo, clearWorkspace, storageError } =
    useWorkspace();
  const [mobileOpen, setMobileOpen] = useState(false),
    [currency, setCurrency] = useState<Currency>(data.settings.currency);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 850);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 850px)");
    const change = () => setIsMobile(query.matches);
    change();
    query.addEventListener("change", change);
    return () => query.removeEventListener("change", change);
  }, []);
  useEffect(() => {
    if (!mobileOpen) return;
    const sidebar = document.getElementById("sidebar-navigation");
    sidebar?.querySelector<HTMLElement>("a,button")?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
        document.querySelector<HTMLElement>(".mobile-toggle")?.focus();
      }
      if (event.key === "Tab") {
        const items = Array.from(
          sidebar?.querySelectorAll<HTMLElement>("a,button") ?? [],
        ).filter((item) => item.offsetParent !== null);
        const first = items[0],
          last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [mobileOpen]);
  function navigate(next: Page) {
    setPage(next);
    setMobileOpen(false);
  }
  useEffect(() => {
    document.title = `Billora · ${page === "dashboard" ? "Overview" : page[0].toUpperCase() + page.slice(1)}`;
    window.scrollTo(0, 0);
  }, [page]);
  function toggleTheme() {
    commit(
      {
        ...data,
        settings: {
          ...data.settings,
          theme: data.settings.theme === "dark" ? "light" : "dark",
        },
      },
      `${data.settings.theme === "dark" ? "Light" : "Dark"} mode enabled`,
    );
  }
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      {mobileOpen && (
        <button
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        id="sidebar-navigation"
        className={`sidebar ${mobileOpen ? "open" : ""}`}
        inert={isMobile && !mobileOpen}
      >
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate("dashboard");
          }}
        >
          <span className="brand-mark">
            b<span>•</span>
          </span>
          <span className="brand-name">
            billora
            <span className="brand-tagline">A little less busywork.</span>
          </span>
        </a>
        <button
          className="icon-btn mobile-nav-close"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        >
          <X size={20} />
        </button>
        <div className="nav-label">WORKSPACE</div>
        <nav aria-label="Main navigation">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`nav-item ${page === id ? "active" : ""}`}
              aria-label={label}
              aria-current={page === id ? "page" : undefined}
              onClick={() => navigate(id)}
            >
              <Icon size={19} />
              <span>{label}</span>
              {id === "invoices" && data.invoices.length > 0 && (
                <small>{data.invoices.length}</small>
              )}
              {page === id && <span className="nav-active-dot" />}
            </button>
          ))}
        </nav>
        <div className="nav-label nav-manage-label">MANAGE</div>
        <nav aria-label="Workspace management">
          {[
            {
              id: "settings" as Page,
              label: "Business settings",
              icon: SettingsIcon,
            },
            {
              id: "backup" as Page,
              label: "Backup & restore",
              icon: DatabaseBackup,
            },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`nav-item ${page === id ? "active" : ""}`}
              aria-label={label}
              aria-current={page === id ? "page" : undefined}
              onClick={() => navigate(id)}
            >
              <Icon size={19} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="workspace-note">
            <span className="note-icon">
              <ShieldCheck size={20} />
            </span>
            <h3>Your business. Your data.</h3>
            <p>
              Stored in your browser.
              <br />
              Always in your hands.
            </p>
            <button onClick={() => navigate("backup")}>
              Keep a safe copy
              <ArrowUpRight size={14} />
            </button>
          </div>
          <button
            className="workspace-card"
            onClick={() => navigate("settings")}
          >
            <span className="workspace-avatar">
              {data.settings.businessName
                .split(" ")
                .map((s) => s[0])
                .slice(0, 2)
                .join("") || "YO"}
            </span>
            <span className="workspace-meta">
              <strong>{data.settings.businessName || "Your business"}</strong>
              <span>{demo ? "Demo workspace" : "Personal workspace"}</span>
            </span>
            <ChevronDown size={15} />
          </button>
          <div className="sidebar-version">
            BILLORA <span>Made for independent work.</span>
          </div>
        </div>
      </aside>
      <div className="main-area" inert={isMobile && mobileOpen}>
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-btn mobile-toggle"
              aria-label="Open navigation"
              aria-expanded={mobileOpen}
              aria-controls="sidebar-navigation"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={21} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>
              {page === "dashboard"
                ? "Overview"
                : page === "backup"
                  ? "Backup & restore"
                  : page === "settings"
                    ? "Business settings"
                    : page[0].toUpperCase() + page.slice(1)}
            </strong>
          </div>
          <div className="topbar-actions">
            <span className="local-indicator">
              <i />
              {storageError ? "Storage unavailable" : "Saved locally"}
            </span>
            <label className="currency-control">
              <Wallet size={15} />
              <select
                aria-label="Dashboard currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
              >
                {currencies.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <button
              className="theme-toggle icon-btn"
              aria-label={`Switch to ${data.settings.theme === "light" ? "dark" : "light"} mode`}
              onClick={toggleTheme}
            >
              {data.settings.theme === "light" ? (
                <Moon size={18} />
              ) : (
                <Sun size={18} />
              )}
            </button>
            <span className="topbar-divider" />
            <button className="btn btn-primary" onClick={() => openInvoice()}>
              <Plus size={17} />
              New invoice
            </button>
          </div>
        </header>
        <main className="main-content" id="main-content" tabIndex={-1}>
          {demo && (
            <div className="demo-banner">
              <Sparkles size={14} />
              <span>You’re exploring sample data.</span>
              <button onClick={clearWorkspace}>
                Start fresh
                <ArrowRightSmall />
              </button>
            </div>
          )}
          {page === "dashboard" ? (
            <Dashboard currency={currency} />
          ) : page === "invoices" ? (
            <Invoices onPrint={onPrint} />
          ) : page === "clients" ? (
            <Clients />
          ) : page === "payments" ? (
            <Payments />
          ) : page === "settings" ? (
            <Settings />
          ) : (
            <Backup />
          )}
          <footer className="app-footer">
            <span>Keep creating. We’ll keep the numbers in order.</span>
            <span>Billora · Your independent workspace</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
function ArrowRightSmall() {
  return <ChevronRight size={13} />;
}
function PrintInvoice({
  invoice,
  onClose,
}: {
  invoice: Invoice;
  onClose: () => void;
}) {
  const { data } = useWorkspace();
  return (
    <Modal
      title={`Invoice ${invoice.invoiceNumber}`}
      subtitle="A clean, ready-to-share invoice. Choose Save as PDF in your browser’s print dialog."
      onClose={onClose}
    >
      <div id="print-root">
        <InvoicePreview
          invoice={invoice}
          client={data.clients.find((c) => c.id === invoice.clientId)}
          settings={data.settings}
          payments={data.payments}
        />
      </div>
      <div className="modal-footer">
        <button className="btn btn-secondary" onClick={onClose}>
          Close
        </button>
        <button className="btn btn-primary" onClick={() => window.print()}>
          <Printer size={16} />
          Print / Save as PDF
        </button>
      </div>
    </Modal>
  );
}
