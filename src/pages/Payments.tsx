import { useMemo, useState } from "react";
import { ArrowDownLeft, CreditCard, Plus, Search, Trash2 } from "lucide-react";
import { useWorkspace } from "../Workspace";
import { currencies, dateLabel, money } from "../lib/calculations";
import type { Payment } from "../lib/types";

export default function Payments() {
  const { data, commit, confirm, openPayment, openInvoice } = useWorkspace();
  const [search, setSearch] = useState("");
  const [currency, setCurrency] = useState("all");
  const rows = useMemo(
    () =>
      data.payments
        .map((payment) => {
          const invoice = data.invoices.find(
            (item) => item.id === payment.invoiceId,
          );
          const client = data.clients.find(
            (item) => item.id === invoice?.clientId,
          );
          return { payment, invoice, client };
        })
        .filter(
          ({ payment, invoice, client }) =>
            (currency === "all" || invoice?.currency === currency) &&
            `${invoice?.invoiceNumber ?? ""} ${client?.name ?? ""} ${payment.method} ${payment.reference}`
              .toLowerCase()
              .includes(search.toLowerCase()),
        )
        .sort(
          (a, b) =>
            b.payment.paymentDate.localeCompare(a.payment.paymentDate) ||
            b.payment.createdAt.localeCompare(a.payment.createdAt),
        ),
    [data, search, currency],
  );

  function deletePayment(payment: Payment, number?: string) {
    confirm({
      title: "Delete this payment?",
      message: `This will remove the ${number ? `payment for ${number}` : "payment"} and recalculate the invoice balance, status, and dashboard totals. The invoice will remain.`,
      confirmLabel: "Delete payment",
      onConfirm: () => {
        commit(
          {
            ...data,
            payments: data.payments.filter((item) => item.id !== payment.id),
          },
          "Payment deleted. Invoice balance updated.",
        );
      },
    });
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">MONEY IN, PEACE OF MIND</p>
          <h1>Payments</h1>
          <p>Every deposit, every payment. A clear record of what came in.</p>
        </div>
        <button className="btn btn-primary" onClick={() => openPayment()}>
          <Plus size={18} /> Record payment
        </button>
      </div>
      <div className="panel">
        <div className="table-toolbar">
          <div className="panel-heading">
            <h2>Payment history</h2>
            <span className="count-badge">{data.payments.length}</span>
          </div>
          <div className="table-filters">
            <label className="search-control">
              <Search size={17} />
              <input
                aria-label="Search payments"
                placeholder="Search payments…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <select
              aria-label="Filter payments by currency"
              value={currency}
              onChange={(event) => setCurrency(event.target.value)}
            >
              <option value="all">All currencies</option>
              {currencies.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        </div>
        {rows.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Invoice</th>
                  <th>Client</th>
                  <th>Method</th>
                  <th>Reference</th>
                  <th className="number-cell">Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ payment, invoice, client }) => (
                  <tr key={payment.id}>
                    <td>{dateLabel(payment.paymentDate)}</td>
                    <td>
                      <strong>
                        {invoice?.invoiceNumber ?? "Missing invoice"}
                      </strong>
                    </td>
                    <td>{client?.name ?? "Unknown client"}</td>
                    <td>
                      <span className="payment-method">
                        <CreditCard size={14} />
                        {payment.method}
                      </span>
                    </td>
                    <td className="reference-cell">
                      {payment.reference || "—"}
                    </td>
                    <td className="number-cell">
                      <span className="amount-received">
                        +
                        {money(
                          payment.amount,
                          invoice?.currency ?? data.settings.currency,
                        )}
                      </span>
                      <span className="cell-subtext">
                        {invoice?.currency ?? data.settings.currency}
                      </span>
                    </td>
                    <td>
                      <button
                        className="icon-btn action-delete"
                        aria-label={`Delete payment for ${invoice?.invoiceNumber ?? "invoice"} on ${dateLabel(payment.paymentDate)}`}
                        title="Delete payment"
                        onClick={() =>
                          deletePayment(payment, invoice?.invoiceNumber)
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <ArrowDownLeft size={34} />
            <h3>
              {search || currency !== "all"
                ? "No matching payments"
                : "Good work deserves to get paid"}
            </h3>
            <p>
              {search || currency !== "all"
                ? "Adjust your search or currency filter to find a payment."
                : "Record a deposit, partial payment, or final payment against an invoice."}
            </p>
            <button
              className="btn btn-secondary"
              onClick={() => {
                if (search || currency !== "all") {
                  setSearch("");
                  setCurrency("all");
                } else if (data.invoices.length) openPayment();
                else openInvoice();
              }}
            >
              {search || currency !== "all"
                ? "Clear filters"
                : data.invoices.length
                  ? "Record a payment"
                  : "Create your first invoice"}
            </button>
          </div>
        )}
        {rows.length > 0 && (
          <div className="panel-footer">
            <CreditCard size={15} />
            <span>
              Payments are recorded manually. Billora does not process or
              transfer money.
            </span>
          </div>
        )}
      </div>
    </>
  );
}
