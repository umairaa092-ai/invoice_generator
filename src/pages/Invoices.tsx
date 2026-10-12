import { useState } from "react";
import {
  Search,
  Plus,
  Copy,
  Pencil,
  Printer,
  Wallet,
  Trash2,
  FileText,
  SlidersHorizontal,
} from "lucide-react";
import { useWorkspace } from "../Workspace";
import type { Invoice } from "../lib/types";
import {
  currencies,
  dateLabel,
  invoiceSummary,
  money,
  totals,
} from "../lib/calculations";
import { Badge } from "../components/Badge";
export default function Invoices({
  onPrint,
}: {
  onPrint: (invoice: Invoice) => void;
}) {
  const { data, openInvoice, openPayment, confirm, commit } = useWorkspace();
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState("all"),
    [currency, setCurrency] = useState("all");
  const rows = [...data.invoices]
    .filter((i) => {
      const s = invoiceSummary(i, data.payments);
      const client = data.clients.find((c) => c.id === i.clientId);
      return (
        (status === "all" || s.status === status) &&
        (currency === "all" || i.currency === currency) &&
        `${i.invoiceNumber} ${client?.name || ""}`
          .toLowerCase()
          .includes(search.toLowerCase())
      );
    })
    .sort(
      (a, b) =>
        b.issueDate.localeCompare(a.issueDate) ||
        b.createdAt.localeCompare(a.createdAt),
    );
  function remove(invoice: Invoice) {
    const count = data.payments.filter(
      (p) => p.invoiceId === invoice.id,
    ).length;
    confirm({
      title: `Delete ${invoice.invoiceNumber}?`,
      message: `This will also delete ${count} linked payment${count === 1 ? "" : "s"}. The client will be kept. Your balances and reports will update automatically.`,
      onConfirm: () =>
        commit(
          {
            ...data,
            invoices: data.invoices.filter((i) => i.id !== invoice.id),
            payments: data.payments.filter((p) => p.invoiceId !== invoice.id),
          },
          "Invoice and linked payments deleted",
        ),
    });
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">FROM GOOD WORK TO GETTING PAID</p>
          <h1>Invoices</h1>
          <p>Every project, every payment. Nicely in order.</p>
        </div>
        <span className="count-label">
          {data.invoices.length} total invoices
        </span>
      </div>
      <section className="panel invoice-list-panel">
        <div className="toolbar">
          <div className="search-control">
            <Search size={17} />
            <input
              aria-label="Search invoices"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search invoice or client…"
            />
          </div>
          <div className="filter-group">
            <SlidersHorizontal size={16} />
            <select
              aria-label="Filter by invoice status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="all">All statuses</option>
              {["Paid", "Partial", "Unpaid", "Overdue"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <select
              aria-label="Filter by invoice currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              <option value="all">All currencies</option>
              {currencies.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="table-wrap">
          <table className="data-table invoice-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Client</th>
                <th>Issued</th>
                <th>Due date</th>
                <th className="align-right">Total</th>
                <th className="align-right">Paid</th>
                <th className="align-right">Balance</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((i) => {
                const c = data.clients.find((c) => c.id === i.clientId),
                  s = invoiceSummary(i, data.payments);
                return (
                  <tr key={i.id}>
                    <td>
                      <button
                        className="invoice-number-link"
                        onClick={() => openInvoice(i)}
                      >
                        {i.invoiceNumber}
                      </button>
                      <span className="cell-subtext">{i.currency}</span>
                    </td>
                    <td>
                      <strong className="client-table-name">
                        {c?.name || "Missing client"}
                      </strong>
                    </td>
                    <td>{dateLabel(i.issueDate)}</td>
                    <td>{dateLabel(i.dueDate)}</td>
                    <td className="align-right table-money">
                      {money(totals(i).total, i.currency)}
                    </td>
                    <td className="align-right">{money(s.paid, i.currency)}</td>
                    <td className="align-right table-money">
                      {money(s.balance, i.currency)}
                    </td>
                    <td>
                      <Badge status={s.status} />
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="action-btn edit"
                          title="Edit"
                          aria-label={`Edit ${i.invoiceNumber}`}
                          onClick={() => openInvoice(i)}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          className="action-btn duplicate"
                          title="Duplicate"
                          aria-label={`Duplicate ${i.invoiceNumber}`}
                          onClick={() => openInvoice(i, true)}
                        >
                          <Copy size={15} />
                        </button>
                        <button
                          className="action-btn print"
                          title="Print"
                          aria-label={`Print ${i.invoiceNumber}`}
                          onClick={() => onPrint(i)}
                        >
                          <Printer size={15} />
                        </button>
                        <button
                          className="action-btn pay"
                          title="Record payment"
                          disabled={s.balance <= 0}
                          aria-label={`Record payment for ${i.invoiceNumber}`}
                          onClick={() => openPayment(i.id)}
                        >
                          <Wallet size={15} />
                        </button>
                        <button
                          className="action-btn delete"
                          title="Delete"
                          aria-label={`Delete ${i.invoiceNumber}`}
                          onClick={() => remove(i)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!rows.length && (
          <div className="empty-state">
            <FileText size={32} />
            <h3>
              {data.invoices.length
                ? "No matching invoices"
                : "A fresh start for your next project"}
            </h3>
            <p>
              {data.invoices.length
                ? "Try another search or change your filters."
                : "Create your first invoice, client, and payment together."}
            </p>
            <button className="btn btn-primary" onClick={() => openInvoice()}>
              <Plus size={16} />
              New invoice
            </button>
          </div>
        )}
        <div className="table-footer">
          <span>
            {rows.length} invoice{rows.length === 1 ? "" : "s"} shown
          </span>
          <span>Amounts shown in each invoice’s currency</span>
        </div>
      </section>
      <div className="local-data-notice">
        <FileText size={17} />
        <p>
          Ready to send? Use Print to save a clean PDF, then share it with your
          client.
        </p>
      </div>
    </>
  );
}
