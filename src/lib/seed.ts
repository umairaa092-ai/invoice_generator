import { addDays, today } from "./calculations";
import type {
  Client,
  Currency,
  Invoice,
  Payment,
  Settings,
  Workspace,
} from "./types";

export const defaultSettings: Settings = {
  businessName: "Your Business",
  email: "",
  phone: "",
  address: "",
  currency: "USD",
  invoicePrefix: "INV",
  paymentTermsDays: 30,
  taxLabel: "Sales tax",
  taxRate: 0,
  paymentInstructions:
    "Thank you for your business. Please include the invoice number with your payment.",
  theme: "light",
};

export function emptyWorkspace(): Workspace {
  return {
    version: 1,
    clients: [],
    invoices: [],
    payments: [],
    settings: { ...defaultSettings },
  };
}

/** Fictional, clearly identified demo records; all dates stay relevant to the current day. */
export function demoWorkspace(): Workspace {
  const workspace = emptyWorkspace();
  const now = new Date().toISOString();
  const current = today();
  workspace.settings = {
    ...workspace.settings,
    businessName: "Northline Studio",
    email: "hello@northline.example",
    phone: "+1 (415) 555-0142",
    address: "125 Market Street, Suite 400\nSan Francisco, CA 94103",
  };
  const clientData: [string, string, string, Currency, string][] = [
    [
      "lumina",
      "Lumina Creative",
      "accounts@lumina.example",
      "USD",
      "180 Hudson Street\nNew York, NY 10013",
    ],
    [
      "arc",
      "Arc & Co.",
      "finance@arc.example",
      "USD",
      "420 Congress Avenue\nAustin, TX 78701",
    ],
    [
      "orbit",
      "Orbit Ventures",
      "billing@orbit.example",
      "USD",
      "88 King Street\nSan Francisco, CA 94107",
    ],
    [
      "westbrook",
      "Westbrook Labs",
      "hello@westbrook.example",
      "USD",
      "210 North Avenue\nChicago, IL 60610",
    ],
    [
      "form",
      "Form & Field",
      "studio@formandfield.example",
      "EUR",
      "24 Rue de Rivoli\n75004 Paris, France",
    ],
    [
      "monocle",
      "Monocle Studio",
      "accounts@monocle.example",
      "GBP",
      "14 Clerkenwell Road\nLondon EC1M 5PQ",
    ],
    [
      "maple",
      "Maple Digital",
      "finance@maple.example",
      "CAD",
      "80 Richmond Street West\nToronto, ON M5H 2A4",
    ],
    [
      "sundown",
      "Sundown Collective",
      "hello@sundown.example",
      "AUD",
      "32 Oxford Street\nSydney NSW 2010",
    ],
  ];
  workspace.clients = clientData.map(
    ([id, name, email, currency, address], index): Client => ({
      id: `demo-client-${id}`,
      name,
      email,
      currency,
      address,
      phone:
        index < 4 ? `+1 (555) 010-${String(index + 11).padStart(4, "0")}` : "",
      paymentTermsDays: 30,
      createdAt: `${addDays(current, -240)}T12:00:00.000Z`,
      updatedAt: now,
    }),
  );

  const monthDate = (monthsAgo: number, day = 10) => {
    const date = new Date(`${current}T12:00:00Z`);
    date.setUTCDate(1);
    date.setUTCMonth(date.getUTCMonth() - monthsAgo);
    const safeDay =
      monthsAgo === 0 ? Math.min(day, Number(current.slice(8))) : day;
    date.setUTCDate(safeDay);
    return date.toISOString().slice(0, 10);
  };
  const makeInvoice = (
    number: number,
    client: string,
    currency: Currency,
    total: number,
    issueDate: string,
    dueDate: string,
    service: string,
  ): Invoice => ({
    id: `demo-invoice-${number}`,
    invoiceNumber: `INV-${String(number).padStart(4, "0")}`,
    clientId: `demo-client-${client}`,
    currency,
    issueDate,
    dueDate,
    lineItems: [
      {
        id: `demo-line-${number}-1`,
        description: service,
        quantity: 1,
        unitPrice: total * 0.75,
      },
      {
        id: `demo-line-${number}-2`,
        description: "Project management & delivery",
        quantity: 1,
        unitPrice: total * 0.25,
      },
    ],
    discount: 0,
    taxLabel: "Sales tax",
    taxRate: 0,
    notes:
      "Thank you for collaborating with Northline Studio. Please include the invoice number with your payment.",
    createdAt: `${issueDate}T12:00:00.000Z`,
    updatedAt: now,
  });
  workspace.invoices = [
    makeInvoice(
      12,
      "lumina",
      "USD",
      8400,
      addDays(monthDate(5), -14),
      monthDate(5),
      "Brand identity & visual system",
    ),
    makeInvoice(
      13,
      "arc",
      "USD",
      6200,
      addDays(monthDate(4), -14),
      monthDate(4),
      "Website design & development",
    ),
    makeInvoice(
      14,
      "orbit",
      "USD",
      4800,
      addDays(monthDate(3), -14),
      monthDate(3),
      "Product discovery workshop",
    ),
    makeInvoice(
      15,
      "lumina",
      "USD",
      5400,
      addDays(monthDate(2), -14),
      monthDate(2),
      "Campaign creative direction",
    ),
    makeInvoice(
      16,
      "westbrook",
      "USD",
      1800,
      addDays(current, -125),
      addDays(current, -95),
      "Research & strategy consultation",
    ),
    makeInvoice(
      17,
      "arc",
      "USD",
      2800,
      addDays(current, -42),
      addDays(current, -12),
      "Monthly design partnership",
    ),
    makeInvoice(
      18,
      "orbit",
      "USD",
      7200,
      addDays(current, -18),
      addDays(current, 12),
      "Platform experience design",
    ),
    makeInvoice(
      19,
      "westbrook",
      "USD",
      6400,
      addDays(current, -6),
      addDays(current, 24),
      "Website launch package",
    ),
    makeInvoice(
      20,
      "form",
      "EUR",
      3200,
      addDays(current, -8),
      addDays(current, 22),
      "Editorial design system",
    ),
    makeInvoice(
      21,
      "monocle",
      "GBP",
      2750,
      addDays(current, -3),
      addDays(current, 27),
      "Art direction & production",
    ),
    makeInvoice(
      22,
      "maple",
      "CAD",
      5800,
      addDays(current, -40),
      addDays(current, -10),
      "Digital brand experience",
    ),
    makeInvoice(
      23,
      "sundown",
      "AUD",
      4100,
      addDays(current, -65),
      addDays(current, -35),
      "E-commerce design refresh",
    ),
  ];
  const makePayment = (
    id: string,
    number: number,
    amount: number,
    paymentDate: string,
    method = "Bank transfer",
  ): Payment => ({
    id: `demo-payment-${id}`,
    invoiceId: `demo-invoice-${number}`,
    paymentDate,
    amount,
    method,
    reference: `NL-${number}-${id.toUpperCase()}`,
    createdAt: `${paymentDate}T12:00:00.000Z`,
    updatedAt: now,
  });
  workspace.payments = [
    makePayment("a", 12, 8400, monthDate(5)),
    makePayment("b", 13, 6200, monthDate(4)),
    makePayment("c", 14, 4800, monthDate(3)),
    makePayment("d", 15, 3800, monthDate(2)),
    makePayment("e", 15, 1600, monthDate(1)),
    makePayment("f", 18, 3200, addDays(current, -5)),
    makePayment("g", 20, 800, addDays(current, -4), "Card"),
    makePayment("h", 22, 5800, addDays(current, -12)),
    makePayment("i", 23, 1000, addDays(current, -36)),
  ];
  return workspace;
}
