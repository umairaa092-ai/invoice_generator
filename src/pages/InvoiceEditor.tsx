import { useState } from "react";
import { Plus, Trash2, UserPlus, Check, Eye, ChevronDown } from "lucide-react";
import { Modal } from "../components/Modal";
import { Field } from "../components/Field";
import { InvoicePreview } from "../components/InvoicePreview";
import { useWorkspace } from "../Workspace";
import type { Client, Invoice, Currency } from "../lib/types";
import {
  currencies,
  today,
  addDays,
  uid,
  nextInvoiceNumber,
  totals,
  money,
  invoiceSummary,
} from "../lib/calculations";
export function InvoiceEditor({
  original,
  duplicate,
  onClose,
}: {
  original?: Invoice;
  duplicate?: boolean;
  onClose: () => void;
}) {
  const { data, commit, toast } = useWorkspace(),
    settings = data.settings;
  const editing = !!original && !duplicate;
  const [invoice, setInvoice] = useState<Invoice>(() =>
    original
      ? {
          ...original,
          id: duplicate ? uid() : original.id,
          invoiceNumber: duplicate
            ? nextInvoiceNumber(data)
            : original.invoiceNumber,
          lineItems: original.lineItems.map((l) => ({
            ...l,
            id: duplicate ? uid() : l.id,
          })),
          issueDate: duplicate ? today() : original.issueDate,
          dueDate: duplicate
            ? addDays(
                today(),
                data.clients.find((c) => c.id === original.clientId)
                  ?.paymentTermsDays ?? settings.paymentTermsDays,
              )
            : original.dueDate,
        }
      : {
          id: uid(),
          invoiceNumber: nextInvoiceNumber(data),
          clientId: "",
          issueDate: today(),
          dueDate: addDays(today(), settings.paymentTermsDays),
          currency: settings.currency,
          lineItems: [
            { id: uid(), description: "", quantity: 1, unitPrice: 0 },
          ],
          discount: 0,
          taxLabel: settings.taxLabel,
          taxRate: settings.taxRate,
          notes: settings.paymentInstructions,
          createdAt: "",
          updatedAt: "",
        },
  );
  const [newClient, setNewClient] = useState(false),
    [client, setClient] = useState({
      name: "",
      email: "",
      phone: "",
      address: "",
      currency: settings.currency,
    });
  const [deposit, setDeposit] = useState(false),
    [payment, setPayment] = useState({
      paymentDate: today(),
      amount: "",
      method: "Bank transfer",
      reference: "",
    });
  const [dirty, setDirty] = useState(false),
    [discard, setDiscard] = useState(false);
  function update<K extends keyof Invoice>(key: K, value: Invoice[K]) {
    setDirty(true);
    setInvoice((i) => ({ ...i, [key]: value }));
  }
  function close() {
    if (dirty) setDiscard(true);
    else onClose();
  }
  const sum = totals(invoice);
  const linked = editing
    ? data.payments.filter((p) => p.invoiceId === invoice.id)
    : [];
  const clientPreview = newClient
    ? ({
        ...client,
        id: "preview",
        paymentTermsDays: settings.paymentTermsDays,
        createdAt: "",
        updatedAt: "",
      } as Client)
    : data.clients.find((c) => c.id === invoice.clientId);
  function save(event: React.FormEvent) {
    event.preventDefault();
    if (!invoice.invoiceNumber.trim())
      return toast("Enter an invoice number.", "error");
    if (
      data.invoices.some(
        (i) =>
          i.id !== invoice.id &&
          i.invoiceNumber.toLowerCase() ===
            invoice.invoiceNumber.trim().toLowerCase(),
      )
    )
      return toast("That invoice number is already in use.", "error");
    if (newClient && !client.name.trim())
      return toast("Enter the new client’s name.", "error");
    if (!newClient && !data.clients.some((c) => c.id === invoice.clientId))
      return toast("Choose a client or add a new one.", "error");
    if (invoice.dueDate < invoice.issueDate)
      return toast("Due date must be on or after issue date.", "error");
    if (
      invoice.lineItems.some(
        (l) =>
          !l.description.trim() ||
          !Number.isFinite(l.quantity) ||
          l.quantity <= 0 ||
          !Number.isFinite(l.unitPrice) ||
          l.unitPrice < 0,
      )
    )
      return toast(
        "Each line item needs a description, positive quantity, and valid price.",
        "error",
      );
    if (invoice.discount < 0 || invoice.discount > sum.subtotal)
      return toast("Discount cannot exceed the subtotal.", "error");
    if (invoice.taxRate < 0 || invoice.taxRate > 100)
      return toast("Tax must be between 0 and 100%.", "error");
    const paid = invoiceSummary(invoice, linked).paid;
    if (paid > sum.total)
      return toast(
        "The new total is below payments already received. Remove or adjust payments first.",
        "error",
      );
    if (linked.length && original?.currency !== invoice.currency)
      return toast(
        "An invoice with recorded payments cannot change currency.",
        "error",
      );
    const depositAmount = Number(payment.amount);
    if (
      deposit &&
      (!Number.isFinite(depositAmount) ||
        depositAmount <= 0 ||
        depositAmount > sum.total ||
        Math.abs(Math.round(depositAmount * 100) - depositAmount * 100) > 1e-7)
    )
      return toast(
        "The deposit must be positive, use up to two decimals, and not exceed the invoice total.",
        "error",
      );
    if (deposit && payment.paymentDate > today())
      return toast("A recorded deposit cannot have a future date.", "error");
    const stamp = new Date().toISOString(),
      clientId = newClient ? uid() : invoice.clientId;
    const saved: Invoice = {
      ...invoice,
      invoiceNumber: invoice.invoiceNumber.trim(),
      clientId,
      lineItems: invoice.lineItems.map((l) => ({
        ...l,
        description: l.description.trim(),
      })),
      createdAt: editing ? invoice.createdAt : stamp,
      updatedAt: stamp,
    };
    const next = {
      ...data,
      clients: newClient
        ? [
            ...data.clients,
            {
              ...client,
              name: client.name.trim(),
              id: clientId,
              paymentTermsDays: settings.paymentTermsDays,
              createdAt: stamp,
              updatedAt: stamp,
            },
          ]
        : data.clients,
      invoices: editing
        ? data.invoices.map((i) => (i.id === saved.id ? saved : i))
        : [...data.invoices, saved],
      payments: deposit
        ? [
            ...data.payments,
            {
              id: uid(),
              invoiceId: saved.id,
              ...payment,
              amount: depositAmount,
              createdAt: stamp,
              updatedAt: stamp,
            },
          ]
        : data.payments,
    };
    if (
      commit(
        next,
        editing
          ? "Invoice updated"
          : `Invoice saved${newClient ? " with your new client" : ""}${deposit ? " and payment" : ""}`,
      )
    )
      onClose();
  }
  if (discard)
    return (
      <Modal
        key="discard"
        title="Discard this draft?"
        subtitle="Your unsaved invoice details will be removed."
        onClose={() => setDiscard(false)}
      >
        <div className="form-actions">
          <button
            className="btn btn-secondary"
            onClick={() => setDiscard(false)}
          >
            Keep editing
          </button>
          <button className="btn btn-danger" onClick={onClose}>
            Discard draft
          </button>
        </div>
      </Modal>
    );
  return (
    <Modal
      key="editor"
      title={
        editing
          ? "Edit invoice"
          : duplicate
            ? "Duplicate invoice"
            : "New invoice"
      }
      subtitle="From first detail to final payment. Everything comes together here."
      onClose={close}
      wide
    >
      <form onSubmit={save} onChangeCapture={() => setDirty(true)}>
        <div className="editor-layout">
          <div className="editor-form">
            <section className="editor-section">
              <div className="section-title">
                <span className="section-number">01</span>
                <h3>Invoice details</h3>
              </div>
              <div className="form-grid">
                <Field label="Invoice number">
                  <input
                    required
                    value={invoice.invoiceNumber}
                    onChange={(e) => update("invoiceNumber", e.target.value)}
                    maxLength={80}
                  />
                </Field>
                <Field label="Currency">
                  <select
                    value={invoice.currency}
                    disabled={linked.length > 0}
                    onChange={(e) =>
                      update("currency", e.target.value as Currency)
                    }
                  >
                    {currencies.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Issue date">
                  <input
                    required
                    type="date"
                    value={invoice.issueDate}
                    onChange={(e) => update("issueDate", e.target.value)}
                  />
                </Field>
                <Field label="Due date">
                  <input
                    required
                    type="date"
                    min={invoice.issueDate}
                    value={invoice.dueDate}
                    onChange={(e) => update("dueDate", e.target.value)}
                  />
                </Field>
              </div>
            </section>
            <section className="editor-section">
              <div className="section-title">
                <span className="section-number">02</span>
                <h3>Who are you billing?</h3>
              </div>
              <div className="inline-choice">
                <button
                  type="button"
                  className={`btn btn-small ${!newClient ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setNewClient(false)}
                >
                  Existing client
                </button>
                <button
                  type="button"
                  className={`btn btn-small ${newClient ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => {
                    setNewClient(true);
                    setDirty(true);
                    if (!linked.length) update("currency", client.currency);
                  }}
                >
                  <UserPlus size={15} />
                  Add new client
                </button>
              </div>
              {!newClient ? (
                <Field label="Client">
                  <select
                    required
                    value={invoice.clientId}
                    onChange={(e) => {
                      const selected = data.clients.find(
                        (c) => c.id === e.target.value,
                      );
                      update("clientId", e.target.value);
                      if (selected && !linked.length)
                        setInvoice((i) => ({
                          ...i,
                          currency: selected.currency,
                          dueDate: addDays(
                            i.issueDate,
                            selected.paymentTermsDays,
                          ),
                        }));
                    }}
                  >
                    <option value="">Select a client</option>
                    {data.clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : (
                <div className="inline-client form-grid">
                  <Field label="Client / company name" className="field-full">
                    <input
                      required
                      value={client.name}
                      onChange={(e) =>
                        setClient((c) => ({ ...c, name: e.target.value }))
                      }
                      placeholder="e.g. Acme Studio"
                      maxLength={200}
                    />
                  </Field>
                  <Field label="Email">
                    <input
                      type="email"
                      value={client.email}
                      onChange={(e) =>
                        setClient((c) => ({ ...c, email: e.target.value }))
                      }
                      placeholder="hello@company.com"
                    />
                  </Field>
                  <Field label="Phone">
                    <input
                      type="tel"
                      value={client.phone}
                      onChange={(e) =>
                        setClient((c) => ({ ...c, phone: e.target.value }))
                      }
                      placeholder="+1 (555) 000-0000"
                    />
                  </Field>
                  <Field label="Billing address" className="field-full">
                    <textarea
                      value={client.address}
                      onChange={(e) =>
                        setClient((c) => ({ ...c, address: e.target.value }))
                      }
                      placeholder="Street, city, postal code"
                      rows={2}
                    />
                  </Field>
                  <Field label="Client default currency">
                    <select
                      value={client.currency}
                      onChange={(e) => {
                        setClient((c) => ({
                          ...c,
                          currency: e.target.value as Currency,
                        }));
                        if (!linked.length)
                          update("currency", e.target.value as Currency);
                      }}
                    >
                      {currencies.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </Field>
                </div>
              )}
            </section>
            <section className="editor-section">
              <div className="section-title">
                <span className="section-number">03</span>
                <h3>Products & services</h3>
              </div>
              <div className="item-editor">
                <div className="item-head">
                  <span>Description</span>
                  <span>Qty</span>
                  <span>Unit price</span>
                  <span>Amount</span>
                  <span />
                </div>
                {invoice.lineItems.map((item, index) => (
                  <div className="item-input-row" key={item.id}>
                    <input
                      aria-label={`Item ${index + 1} description`}
                      required
                      value={item.description}
                      placeholder="What did you work on?"
                      onChange={(e) =>
                        update(
                          "lineItems",
                          invoice.lineItems.map((l) =>
                            l.id === item.id
                              ? { ...l, description: e.target.value }
                              : l,
                          ),
                        )
                      }
                    />
                    <input
                      aria-label={`Item ${index + 1} quantity`}
                      required
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={item.quantity || ""}
                      onChange={(e) =>
                        update(
                          "lineItems",
                          invoice.lineItems.map((l) =>
                            l.id === item.id
                              ? { ...l, quantity: Number(e.target.value) }
                              : l,
                          ),
                        )
                      }
                    />
                    <input
                      aria-label={`Item ${index + 1} unit price`}
                      required
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) =>
                        update(
                          "lineItems",
                          invoice.lineItems.map((l) =>
                            l.id === item.id
                              ? { ...l, unitPrice: Number(e.target.value) }
                              : l,
                          ),
                        )
                      }
                    />
                    <span className="item-amount">
                      {money(item.quantity * item.unitPrice, invoice.currency)}
                    </span>
                    <button
                      type="button"
                      className="icon-btn danger"
                      aria-label={`Remove item ${index + 1}`}
                      disabled={invoice.lineItems.length === 1}
                      onClick={() =>
                        update(
                          "lineItems",
                          invoice.lineItems.filter((l) => l.id !== item.id),
                        )
                      }
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-small"
                onClick={() =>
                  update("lineItems", [
                    ...invoice.lineItems,
                    { id: uid(), description: "", quantity: 1, unitPrice: 0 },
                  ])
                }
              >
                <Plus size={15} />
                Add line item
              </button>
              <div className="form-grid-three invoice-adjustments">
                <Field label={`Discount (${invoice.currency})`}>
                  <input
                    type="number"
                    min="0"
                    max={sum.subtotal}
                    step="0.01"
                    value={invoice.discount}
                    onChange={(e) => update("discount", Number(e.target.value))}
                  />
                </Field>
                <Field label="Tax label">
                  <input
                    value={invoice.taxLabel}
                    onChange={(e) => update("taxLabel", e.target.value)}
                    placeholder="Tax"
                  />
                </Field>
                <Field label="Tax (%)">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={invoice.taxRate}
                    onChange={(e) => update("taxRate", Number(e.target.value))}
                  />
                </Field>
              </div>
              <div className="totals-box">
                <div className="total-row">
                  <span>Subtotal</span>
                  <span>{money(sum.subtotal, invoice.currency)}</span>
                </div>
                <div className="total-row">
                  <span>Discount</span>
                  <span>−{money(sum.discount, invoice.currency)}</span>
                </div>
                <div className="total-row">
                  <span>
                    {invoice.taxLabel || "Tax"} ({invoice.taxRate}%)
                  </span>
                  <span>{money(sum.tax, invoice.currency)}</span>
                </div>
                <div className="total-row grand-total">
                  <strong>Invoice total</strong>
                  <strong>{money(sum.total, invoice.currency)}</strong>
                </div>
              </div>
            </section>
            <section className="editor-section">
              <Field label="Notes & payment instructions">
                <textarea
                  rows={3}
                  value={invoice.notes}
                  onChange={(e) => update("notes", e.target.value)}
                  placeholder="A thank you, payment details, or a note to your client…"
                />
              </Field>
              {!editing && (
                <>
                  <label className="payment-toggle">
                    <input
                      type="checkbox"
                      checked={deposit}
                      onChange={(e) => {
                        setDeposit(e.target.checked);
                        setDirty(true);
                      }}
                    />
                    <span>
                      <strong>Record a payment or deposit now</strong>
                      <small>
                        Save the invoice and its initial payment together.
                      </small>
                    </span>
                    <ChevronDown size={17} />
                  </label>
                  {deposit && (
                    <div className="deposit-fields form-grid">
                      <Field label="Payment date">
                        <input
                          required
                          type="date"
                          max={today()}
                          value={payment.paymentDate}
                          onChange={(e) =>
                            setPayment((p) => ({
                              ...p,
                              paymentDate: e.target.value,
                            }))
                          }
                        />
                      </Field>
                      <Field label={`Deposit amount (${invoice.currency})`}>
                        <input
                          required
                          type="number"
                          min="0.01"
                          max={sum.total}
                          step="0.01"
                          value={payment.amount}
                          placeholder="0.00"
                          onChange={(e) =>
                            setPayment((p) => ({
                              ...p,
                              amount: e.target.value,
                            }))
                          }
                        />
                      </Field>
                      <Field label="Payment method">
                        <select
                          value={payment.method}
                          onChange={(e) =>
                            setPayment((p) => ({
                              ...p,
                              method: e.target.value,
                            }))
                          }
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
                          value={payment.reference}
                          onChange={(e) =>
                            setPayment((p) => ({
                              ...p,
                              reference: e.target.value,
                            }))
                          }
                          placeholder="Transaction reference"
                        />
                      </Field>
                    </div>
                  )}
                </>
              )}
            </section>
          </div>
          <aside className="editor-preview">
            <div className="preview-caption">
              <Eye size={15} />
              Live preview<span>Updates as you go</span>
            </div>
            <InvoicePreview
              invoice={invoice}
              client={clientPreview}
              settings={settings}
              payments={linked}
            />
            <div className="preview-tip">
              A little detail makes a great impression. Print or save as PDF
              after saving your invoice.
            </div>
          </aside>
        </div>
        <div className="modal-footer editor-footer">
          <span className="text-muted">Saved privately in this browser</span>
          <button type="button" className="btn btn-secondary" onClick={close}>
            Cancel
          </button>
          <button className="btn btn-primary" type="submit">
            <Check size={17} />
            {editing ? "Save changes" : "Save invoice"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
