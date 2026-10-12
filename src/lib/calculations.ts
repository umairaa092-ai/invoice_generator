import type {
  Currency,
  Invoice,
  InvoiceStatus,
  Payment,
  Workspace,
} from "./types";

export const currencies: readonly Currency[] = [
  "USD",
  "GBP",
  "CAD",
  "AUD",
  "EUR",
];

/** Keep all monetary calculations at the currencies' shared two-decimal precision. */
export function roundMoney(value: number): number {
  const absolute = Math.abs(value);
  return (
    (Math.sign(value) *
      Math.round((absolute + Number.EPSILON * Math.max(1, absolute)) * 100)) /
    100
  );
}

export function money(amount: number, currency: Currency): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
    amount,
  );
}

export function dateLabel(date: string): string {
  const parsed = new Date(`${date}T12:00:00Z`);
  if (!Number.isFinite(parsed.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

export function today(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function uid(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

export function addDays(date: string, days: number): string {
  const parsed = new Date(`${date}T12:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

export function totals(
  invoice: Pick<Invoice, "lineItems" | "discount" | "taxRate">,
) {
  const subtotal = roundMoney(
    invoice.lineItems.reduce(
      (sum, item) => sum + roundMoney(item.quantity * item.unitPrice),
      0,
    ),
  );
  const discount = roundMoney(invoice.discount);
  const taxable = roundMoney(subtotal - discount);
  const tax = roundMoney((taxable * invoice.taxRate) / 100);
  return { subtotal, discount, tax, total: roundMoney(taxable + tax) };
}

export function invoiceSummary(
  invoice: Invoice,
  payments: Payment[],
  asOf = today(),
): {
  paid: number;
  balance: number;
  status: InvoiceStatus;
} {
  const paid = roundMoney(
    payments.reduce(
      (sum, payment) =>
        payment.invoiceId === invoice.id ? sum + payment.amount : sum,
      0,
    ),
  );
  const balance = roundMoney(totals(invoice).total - paid);
  const status: InvoiceStatus =
    balance <= 0
      ? "Paid"
      : invoice.dueDate < asOf
        ? "Overdue"
        : paid > 0
          ? "Partial"
          : "Unpaid";
  return { paid, balance, status };
}

export function nextInvoiceNumber(workspace: Workspace): string {
  const prefix =
    workspace.settings.invoicePrefix.trim().replace(/-+$/, "") || "INV";
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`^${escaped}-(\\d+)$`, "i");
  let highest = 0;
  for (const invoice of workspace.invoices) {
    const match = invoice.invoiceNumber.match(pattern);
    if (match) highest = Math.max(highest, Number(match[1]));
  }
  const occupied = new Set(
    workspace.invoices.map((invoice) =>
      invoice.invoiceNumber.trim().toLowerCase(),
    ),
  );
  let number: string;
  do {
    highest += 1;
    number = `${prefix}-${String(highest).padStart(4, "0")}`;
  } while (occupied.has(number.toLowerCase()));
  return number;
}
