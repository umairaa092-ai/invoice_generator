import { useState } from "react";
import { Wallet } from "lucide-react";
import { Modal } from "./Modal";
import { Field } from "./Field";
import { useWorkspace } from "../Workspace";
import { invoiceSummary, money, today, uid } from "../lib/calculations";
export function PaymentEditor({
  invoiceId,
  onClose,
}: {
  invoiceId?: string;
  onClose: () => void;
}) {
  const { data, commit, toast } = useWorkspace();
  const available = data.invoices.filter(
    (i) => invoiceSummary(i, data.payments).balance > 0,
  );
  const [selected, setSelected] = useState(invoiceId || available[0]?.id || "");
  const [date, setDate] = useState(today()),
    [amount, setAmount] = useState(""),
    [method, setMethod] = useState("Bank transfer"),
    [reference, setReference] = useState("");
  const invoice = data.invoices.find((i) => i.id === selected),
    summary = invoice ? invoiceSummary(invoice, data.payments) : undefined;
  function save(event: React.FormEvent) {
    event.preventDefault();
    if (!invoice || !summary) return toast("Choose an invoice.", "error");
    const value = Number(amount);
    if (
      !Number.isFinite(value) ||
      value <= 0 ||
      value > summary.balance ||
      (Math.round(value * 100) !== value * 100 &&
        Math.abs(Math.round(value * 100) - value * 100) > 1e-7)
    )
      return toast(
        "Enter a positive payment with up to two decimals that does not exceed the balance.",
        "error",
      );
    if (date > today())
      return toast("A recorded payment cannot have a future date.", "error");
    const stamp = new Date().toISOString();
    if (
      commit(
        {
          ...data,
          payments: [
            ...data.payments,
            {
              id: uid(),
              invoiceId: invoice.id,
              paymentDate: date,
              amount: value,
              method,
              reference: reference.trim(),
              createdAt: stamp,
              updatedAt: stamp,
            },
          ],
        },
        "Payment recorded. Your balances are up to date.",
      )
    )
      onClose();
  }
  return (
    <Modal
      title="Record a payment"
      subtitle="Deposits, partial payments, or a final payment — all in one place."
      onClose={onClose}
    >
      {!available.length ? (
        <div className="empty-state">
          <Wallet size={35} />
          <h3>All caught up</h3>
          <p>You don’t have any outstanding invoices.</p>
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      ) : (
        <form onSubmit={save}>
          <Field label="Invoice">
            <select
              required
              value={selected}
              onChange={(e) => {
                setSelected(e.target.value);
                setAmount("");
              }}
            >
              {available.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.invoiceNumber} ·{" "}
                  {data.clients.find((c) => c.id === i.clientId)?.name} ·{" "}
                  {i.currency}
                </option>
              ))}
            </select>
          </Field>
          {invoice && summary && (
            <div className="payment-balance">
              <span>Current balance</span>
              <strong>{money(summary.balance, invoice.currency)}</strong>
              <button
                type="button"
                className="table-link"
                onClick={() => setAmount(String(summary.balance))}
              >
                Use full balance
              </button>
            </div>
          )}
          <div className="form-grid">
            <Field label="Payment date">
              <input
                required
                type="date"
                max={today()}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </Field>
            <Field label={`Amount (${invoice?.currency || "USD"})`}>
              <input
                required
                type="number"
                min="0.01"
                max={summary?.balance}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </Field>
            <Field label="Payment method">
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
              >
                {[
                  "Bank transfer",
                  "Card",
                  "Cash",
                  "PayPal",
                  "Check",
                  "Other",
                ].map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </Field>
            <Field label="Reference (optional)">
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Transaction or receipt number"
                maxLength={200}
              />
            </Field>
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button className="btn btn-primary" type="submit">
              <Wallet size={16} />
              Save payment
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
