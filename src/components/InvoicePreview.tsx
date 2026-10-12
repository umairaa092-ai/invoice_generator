import type { Client, Invoice, Settings, Payment } from "../lib/types";
import {
  dateLabel,
  money,
  totals,
  invoiceSummary,
  roundMoney,
} from "../lib/calculations";
export function InvoicePreview({
  invoice,
  client,
  settings,
  payments = [],
}: {
  invoice: Invoice;
  client?: Client;
  settings: Settings;
  payments?: Payment[];
}) {
  const sum = totals(invoice),
    summary = invoiceSummary(invoice, payments);
  return (
    <article className="invoice-preview" aria-label="Invoice preview">
      <div className="preview-header">
        <div className="preview-brand">
          <span className="preview-brand-mark">
            {settings.businessName.trim().slice(0, 1) || "B"}
          </span>
          <div>
            <strong>{settings.businessName || "Your business"}</strong>
            <span>{settings.email}</span>
          </div>
        </div>
        <span className="preview-title">INVOICE</span>
      </div>
      <div className="preview-meta">
        <strong>{invoice.invoiceNumber || "Invoice number"}</strong>
        <div>
          <span>Issued {dateLabel(invoice.issueDate)}</span>
          <span>Due {dateLabel(invoice.dueDate)}</span>
        </div>
      </div>
      <div className="preview-billing">
        <div>
          <small>FROM</small>
          <strong>{settings.businessName || "Your business"}</strong>
          <p>{settings.address}</p>
          <p>{settings.phone}</p>
        </div>
        <div>
          <small>BILL TO</small>
          <strong>{client?.name || "Your client"}</strong>
          <p>{client?.address || "Billing address"}</p>
          <p>{client?.email}</p>
        </div>
      </div>
      <table className="preview-items">
        <colgroup>
          <col style={{ width: "48%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "20%" }} />
          <col style={{ width: "20%" }} />
        </colgroup>
        <thead>
          <tr>
            <th>Description</th>
            <th>Qty</th>
            <th>Price</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.lineItems.map((item) => (
            <tr key={item.id}>
              <td>{item.description || "Item description"}</td>
              <td>{item.quantity}</td>
              <td>{money(item.unitPrice, invoice.currency)}</td>
              <td>
                {money(
                  roundMoney(item.quantity * item.unitPrice),
                  invoice.currency,
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="preview-totals">
        <div>
          <span>Subtotal</span>
          <span>{money(sum.subtotal, invoice.currency)}</span>
        </div>
        {invoice.discount > 0 && (
          <div>
            <span>Discount</span>
            <span>−{money(sum.discount, invoice.currency)}</span>
          </div>
        )}
        <div>
          <span>
            {invoice.taxLabel || "Tax"} ({invoice.taxRate}%)
          </span>
          <span>{money(sum.tax, invoice.currency)}</span>
        </div>
        <div className="preview-total">
          <strong>Total · {invoice.currency}</strong>
          <strong>{money(sum.total, invoice.currency)}</strong>
        </div>
        {summary.paid > 0 && (
          <>
            <div>
              <span>Payments received</span>
              <span>−{money(summary.paid, invoice.currency)}</span>
            </div>
            <div>
              <strong>Balance due</strong>
              <strong>{money(summary.balance, invoice.currency)}</strong>
            </div>
          </>
        )}
      </div>
      <div className="preview-notes">
        <small>NOTES & PAYMENT INSTRUCTIONS</small>
        <p>{invoice.notes || "Thank you for your business."}</p>
      </div>
      <div className="preview-footer">
        Thank you for choosing {settings.businessName || "us"}.
        <span>Made with Billora</span>
      </div>
    </article>
  );
}
