import { currencies, roundMoney, totals } from "./calculations";
import { isSafeBusinessLogo } from "./branding";
import type {
  Client,
  Currency,
  Invoice,
  Payment,
  Settings,
  Workspace,
} from "./types";

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new ValidationError(message);
}

function object(
  value: unknown,
  label: string,
): asserts value is Record<string, unknown> {
  assert(
    value !== null && typeof value === "object" && !Array.isArray(value),
    `${label} must be an object.`,
  );
}

function string(
  value: unknown,
  label: string,
  required = false,
): asserts value is string {
  assert(typeof value === "string", `${label} must be text.`);
  if (required) assert(value.trim().length > 0, `${label} is required.`);
}

function number(
  value: unknown,
  label: string,
  min = 0,
  max = 1_000_000_000,
): asserts value is number {
  assert(
    typeof value === "number" && Number.isFinite(value),
    `${label} must be a finite number.`,
  );
  assert(
    value >= min && value <= max,
    `${label} must be between ${min} and ${max}.`,
  );
}

function currency(value: unknown): asserts value is Currency {
  assert(
    currencies.includes(value as Currency),
    "Currency must be USD, GBP, CAD, AUD, or EUR.",
  );
}

function date(value: unknown, label: string): asserts value is string {
  string(value, label, true);
  assert(/^\d{4}-\d{2}-\d{2}$/.test(value), `${label} must be a valid date.`);
  const parsed = new Date(`${value}T12:00:00Z`);
  assert(
    Number.isFinite(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value,
    `${label} must be a valid date.`,
  );
}

function timestamp(value: unknown, label: string): asserts value is string {
  string(value, label, true);
  assert(
    /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value)),
    `${label} must be a valid timestamp.`,
  );
}

function recordBase(value: Record<string, unknown>, label: string) {
  string(value.id, `${label} ID`, true);
  timestamp(value.createdAt, `${label} creation date`);
  timestamp(value.updatedAt, `${label} update date`);
}

function unique(values: string[], label: string) {
  assert(new Set(values).size === values.length, `Duplicate ${label} found.`);
}

export function validateClient(value: unknown): asserts value is Client {
  object(value, "Client");
  recordBase(value, "Client");
  string(value.name, "Client name", true);
  string(value.email, "Client email");
  string(value.phone, "Client phone");
  string(value.address, "Client address");
  if (value.email)
    assert(
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email),
      "Enter a valid client email.",
    );
  currency(value.currency);
  number(value.paymentTermsDays, "Payment terms", 0, 365);
  assert(
    Number.isInteger(value.paymentTermsDays),
    "Payment terms must be whole days.",
  );
}

export function validateInvoice(value: unknown): asserts value is Invoice {
  object(value, "Invoice");
  recordBase(value, "Invoice");
  string(value.invoiceNumber, "Invoice number", true);
  string(value.clientId, "Invoice client", true);
  date(value.issueDate, "Issue date");
  date(value.dueDate, "Due date");
  assert(
    value.dueDate >= value.issueDate,
    "Due date cannot be before the issue date.",
  );
  currency(value.currency);
  assert(
    Array.isArray(value.lineItems) && value.lineItems.length > 0,
    "Add at least one line item.",
  );
  for (const item of value.lineItems) {
    object(item, "Line item");
    string(item.id, "Line item ID", true);
    string(item.description, "Item description", true);
    number(item.quantity, "Quantity", Number.MIN_VALUE, 1_000_000);
    number(item.unitPrice, "Unit price");
    assert(
      Number.isFinite(item.quantity * item.unitPrice) &&
        item.quantity * item.unitPrice <= 1_000_000_000,
      "Line item amount is too large.",
    );
  }
  unique(
    value.lineItems.map((item) => item.id as string),
    "line item IDs",
  );
  number(value.discount, "Discount");
  number(value.taxRate, "Tax rate", 0, 100);
  string(value.taxLabel, "Tax label");
  string(value.notes, "Invoice notes");
  const calculation = totals(value as unknown as Invoice);
  assert(
    Number.isFinite(calculation.total) && calculation.total <= 1_000_000_000,
    "Invoice total is too large.",
  );
  assert(
    value.discount <= calculation.subtotal,
    "Discount cannot exceed the subtotal.",
  );
}

export function validatePayment(value: unknown): asserts value is Payment {
  object(value, "Payment");
  recordBase(value, "Payment");
  string(value.invoiceId, "Payment invoice", true);
  date(value.paymentDate, "Payment date");
  number(value.amount, "Payment amount", 0.01);
  assert(
    Math.abs(value.amount - roundMoney(value.amount)) < 1e-8,
    "Payment amount can have at most two decimal places.",
  );
  string(value.method, "Payment method", true);
  string(value.reference, "Payment reference");
}

export function validateSettings(value: unknown): asserts value is Settings {
  object(value, "Business settings");
  string(value.businessName, "Business name");
  if (value.businessLogo !== undefined) {
    string(value.businessLogo, "Business logo");
    assert(
      isSafeBusinessLogo(value.businessLogo),
      "Business logo must be a processed PNG, JPEG, or WEBP image under 1 MB.",
    );
  }
  if (value.businessTagline !== undefined) {
    string(value.businessTagline, "Business tagline");
    assert(
      value.businessTagline.length <= 160,
      "Business tagline must be 160 characters or fewer.",
    );
  }
  if (value.invoiceAccentColor !== undefined) {
    string(value.invoiceAccentColor, "Invoice accent color");
    assert(
      value.invoiceAccentColor === "" ||
        /^#[\da-f]{6}$/i.test(value.invoiceAccentColor),
      "Invoice accent color must be a six-digit hex color, such as #7560db.",
    );
  }
  string(value.email, "Business email");
  string(value.phone, "Business phone");
  string(value.address, "Business address");
  if (value.email)
    assert(
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email),
      "Enter a valid business email.",
    );
  currency(value.currency);
  string(value.invoicePrefix, "Invoice prefix", true);
  number(value.paymentTermsDays, "Payment terms", 0, 365);
  assert(
    Number.isInteger(value.paymentTermsDays),
    "Payment terms must be whole days.",
  );
  string(value.taxLabel, "Tax label");
  number(value.taxRate, "Tax rate", 0, 100);
  string(value.paymentInstructions, "Payment instructions");
  assert(
    value.theme === "light" || value.theme === "dark",
    "Theme must be light or dark.",
  );
}

export function validateWorkspace(value: unknown): asserts value is Workspace {
  object(value, "Backup");
  assert(
    value.version === 1,
    "This backup uses an unsupported format. Expected version 1.",
  );
  assert(Array.isArray(value.clients), "Backup clients must be a list.");
  assert(Array.isArray(value.invoices), "Backup invoices must be a list.");
  assert(Array.isArray(value.payments), "Backup payments must be a list.");
  validateSettings(value.settings);
  value.clients.forEach(validateClient);
  value.invoices.forEach(validateInvoice);
  value.payments.forEach(validatePayment);
  const clients = value.clients as Client[];
  const invoices = value.invoices as Invoice[];
  const payments = value.payments as Payment[];
  unique(
    clients.map((client) => client.id),
    "client IDs",
  );
  unique(
    invoices.map((invoice) => invoice.id),
    "invoice IDs",
  );
  unique(
    payments.map((payment) => payment.id),
    "payment IDs",
  );
  unique(
    invoices.map((invoice) => invoice.invoiceNumber.trim().toLowerCase()),
    "invoice numbers",
  );
  const clientIds = new Set(clients.map((client) => client.id));
  const invoiceMap = new Map(invoices.map((invoice) => [invoice.id, invoice]));
  for (const invoice of invoices)
    assert(
      clientIds.has(invoice.clientId),
      `Invoice ${invoice.invoiceNumber} refers to a missing client.`,
    );
  const paid = new Map<string, number>();
  for (const payment of payments) {
    assert(
      invoiceMap.has(payment.invoiceId),
      "A payment refers to a missing invoice.",
    );
    paid.set(
      payment.invoiceId,
      roundMoney((paid.get(payment.invoiceId) || 0) + payment.amount),
    );
  }
  for (const [invoiceId, amount] of paid) {
    const invoice = invoiceMap.get(invoiceId)!;
    assert(
      amount <= totals(invoice).total,
      `Payments for ${invoice.invoiceNumber} exceed the invoice total.`,
    );
  }
}
