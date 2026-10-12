export type Currency = "USD" | "GBP" | "CAD" | "AUD" | "EUR";

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  currency: Currency;
  paymentTermsDays: number;
  createdAt: string;
  updatedAt: string;
}

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  issueDate: string;
  dueDate: string;
  currency: Currency;
  lineItems: LineItem[];
  /** A fixed amount, applied before tax. */
  discount: number;
  taxLabel: string;
  taxRate: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  invoiceId: string;
  paymentDate: string;
  amount: number;
  method: string;
  reference: string;
  createdAt: string;
  updatedAt: string;
}

export interface Settings {
  businessName: string;
  /** Optional to preserve version-1 workspaces created before business branding. */
  businessLogo?: string;
  businessTagline?: string;
  invoiceAccentColor?: string;
  email: string;
  phone: string;
  address: string;
  currency: Currency;
  invoicePrefix: string;
  paymentTermsDays: number;
  taxLabel: string;
  taxRate: number;
  paymentInstructions: string;
  theme: "light" | "dark";
}

export interface Workspace {
  version: 1;
  clients: Client[];
  invoices: Invoice[];
  payments: Payment[];
  settings: Settings;
}

export type InvoiceStatus = "Paid" | "Partial" | "Unpaid" | "Overdue";
