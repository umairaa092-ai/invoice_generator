import { afterEach, describe, expect, it, vi } from "vitest";
import { mergeWorkspace, parseBackup } from "../src/lib/backup";
import {
  addDays,
  currencies,
  invoiceSummary,
  money,
  nextInvoiceNumber,
  roundMoney,
  totals,
} from "../src/lib/calculations";
import { demoWorkspace, emptyWorkspace } from "../src/lib/seed";
import { loadWorkspace, saveWorkspace, STORAGE_KEY } from "../src/lib/storage";
import type { Invoice, Payment, Workspace } from "../src/lib/types";

const timestamp = "2026-01-01T12:00:00.000Z";

function fixture(): Workspace {
  const demo = demoWorkspace();
  const client = {
    ...demo.clients[0],
    id: "client",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const invoice: Invoice = {
    ...demo.invoices[0],
    id: "invoice",
    clientId: "client",
    invoiceNumber: "INV-0001",
    issueDate: "2026-01-01",
    dueDate: "2026-01-31",
    currency: "USD",
    lineItems: [
      {
        id: "line",
        description: "Design services",
        quantity: 2,
        unitPrice: 50,
      },
    ],
    discount: 0,
    taxRate: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  return { ...emptyWorkspace(), clients: [client], invoices: [invoice] };
}

function payment(
  amount: number,
  id = "payment",
  invoiceId = "invoice",
): Payment {
  return {
    id,
    invoiceId,
    amount,
    paymentDate: "2026-01-10",
    method: "Bank transfer",
    reference: "",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

describe("invoice calculations and financial statuses", () => {
  it("rounds fractional line items, applies a fixed discount before tax, and uses cents", () => {
    const invoice = fixture().invoices[0];
    invoice.lineItems = [
      { id: "a", description: "Consultation", quantity: 1.5, unitPrice: 2.51 },
      { id: "b", description: "Materials", quantity: 1, unitPrice: 10.075 },
    ];
    invoice.discount = 1;
    invoice.taxRate = 8.25;
    expect(totals(invoice)).toEqual({
      subtotal: 13.85,
      discount: 1,
      tax: 1.06,
      total: 13.91,
    });
    expect(roundMoney(1.005)).toBe(1.01);
    expect(roundMoney(10.075)).toBe(10.08);
  });

  it("moves through unpaid, partial, paid, and back to partial after deleting a payment", () => {
    const invoice = fixture().invoices[0];
    const first = payment(25);
    const final = payment(75, "final");
    expect(invoiceSummary(invoice, [], "2026-01-31")).toEqual({
      paid: 0,
      balance: 100,
      status: "Unpaid",
    });
    expect(invoiceSummary(invoice, [first], "2026-01-31")).toEqual({
      paid: 25,
      balance: 75,
      status: "Partial",
    });
    expect(invoiceSummary(invoice, [first, final], "2026-01-31")).toEqual({
      paid: 100,
      balance: 0,
      status: "Paid",
    });
    expect(invoiceSummary(invoice, [first], "2026-01-31").status).toBe(
      "Partial",
    );
  });

  it("marks outstanding balances overdue only after the due date, including partially paid invoices", () => {
    const invoice = fixture().invoices[0];
    expect(invoiceSummary(invoice, [], "2026-01-31").status).toBe("Unpaid");
    expect(invoiceSummary(invoice, [], "2026-02-01").status).toBe("Overdue");
    expect(invoiceSummary(invoice, [payment(25)], "2026-02-01").status).toBe(
      "Overdue",
    );
    expect(invoiceSummary(invoice, [payment(100)], "2026-02-01").status).toBe(
      "Paid",
    );
  });

  it("never applies payments from another invoice, even when the currency differs", () => {
    const workspace = fixture();
    const euroInvoice = {
      ...workspace.invoices[0],
      id: "euro",
      currency: "EUR" as const,
    };
    expect(
      invoiceSummary(
        workspace.invoices[0],
        [payment(60), payment(80, "eu", euroInvoice.id)],
        "2026-01-20",
      ).paid,
    ).toBe(60);
    expect(
      invoiceSummary(
        euroInvoice,
        [payment(60), payment(80, "eu", euroInvoice.id)],
        "2026-01-20",
      ).paid,
    ).toBe(80);
    expect(currencies).toEqual(["USD", "GBP", "CAD", "AUD", "EUR"]);
    expect(money(100, "USD")).toBe("$100.00");
    expect(money(100, "EUR")).toBe("€100.00");
  });

  it("handles a completely discounted zero-total invoice without inventing an outstanding balance", () => {
    const workspace = fixture();
    workspace.invoices[0].discount = 100;
    expect(invoiceSummary(workspace.invoices[0], [], "2026-02-01")).toEqual({
      paid: 0,
      balance: 0,
      status: "Paid",
    });
    expect(() => parseBackup(JSON.stringify(workspace))).not.toThrow();
  });

  it("advances unique invoice numbers for a changed or punctuated prefix", () => {
    const workspace = fixture();
    expect(nextInvoiceNumber(workspace)).toBe("INV-0002");
    workspace.settings.invoicePrefix = "NL.2026-";
    workspace.invoices[0].invoiceNumber = "NL.2026-0089";
    expect(nextInvoiceNumber(workspace)).toBe("NL.2026-0090");
  });

  it("adds days through leap years and year boundaries", () => {
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
});

describe("backup validation and merge", () => {
  it("accepts complete demo data and separates its financial totals by currency", () => {
    const demo = parseBackup(JSON.stringify(demoWorkspace()));
    const usd = demo.invoices.filter((invoice) => invoice.currency === "USD");
    expect(usd.reduce((sum, invoice) => sum + totals(invoice).total, 0)).toBe(
      43000,
    );
    expect(
      usd.reduce(
        (sum, invoice) => sum + invoiceSummary(invoice, demo.payments).paid,
        0,
      ),
    ).toBe(28000);
    expect(demo.invoices.some((invoice) => invoice.currency === "EUR")).toBe(
      true,
    );
  });

  it("preserves additional current records and settings while adding missing backup records", () => {
    const current = fixture();
    current.settings.businessName = "My real business";
    const backup = fixture();
    backup.settings.businessName = "Old settings";
    backup.clients.push({
      ...backup.clients[0],
      id: "new-client",
      name: "Added client",
    });
    current.invoices.push({
      ...current.invoices[0],
      id: "additional",
      invoiceNumber: "INV-0002",
    });
    const merged = mergeWorkspace(current, backup);
    expect(merged.clients).toHaveLength(2);
    expect(merged.invoices).toHaveLength(2);
    expect(merged.settings.businessName).toBe("My real business");
    merged.clients[0].name = "Edited later";
    expect(current.clients[0].name).not.toBe("Edited later");
  });

  it("uses the newer record and chooses current records on equal timestamps", () => {
    const current = fixture();
    const incoming = clone(current);
    current.clients[0].name = "Current name";
    incoming.clients[0].name = "Older name";
    expect(mergeWorkspace(current, incoming).clients[0].name).toBe(
      "Current name",
    );
    incoming.clients[0].updatedAt = "2026-02-01T12:00:00.000Z";
    incoming.clients[0].name = "Newer name";
    expect(mergeWorkspace(current, incoming).clients[0].name).toBe(
      "Newer name",
    );
  });

  it("rejects number collisions produced by a merge without modifying either workspace", () => {
    const current = fixture();
    const incoming = fixture();
    incoming.invoices[0].id = "other-invoice";
    const before = JSON.stringify(current);
    expect(() => mergeWorkspace(current, incoming)).toThrow(
      /Duplicate invoice numbers/,
    );
    expect(JSON.stringify(current)).toBe(before);
    expect(incoming.invoices[0].id).toBe("other-invoice");
  });

  it("rejects merge results that combine independent payments into an overpayment", () => {
    const current = fixture();
    current.payments = [payment(70, "one")];
    const incoming = fixture();
    incoming.payments = [payment(50, "two")];
    expect(() => mergeWorkspace(current, incoming)).toThrow(
      /exceed the invoice total/,
    );
    expect(current.payments).toHaveLength(1);
  });

  it.each([
    ["malformed JSON", "{"],
    [
      "unsupported version",
      JSON.stringify({ ...emptyWorkspace(), version: 2 }),
    ],
    ["missing required fields", JSON.stringify({ version: 1 })],
    [
      "incorrect collection type",
      JSON.stringify({ ...emptyWorkspace(), clients: {} }),
    ],
  ])("rejects %s", (_, input) => {
    expect(() => parseBackup(input)).toThrow();
  });

  it("rejects broken relationships and duplicate numbers regardless of case", () => {
    const missingClient = fixture();
    missingClient.clients = [];
    expect(() => parseBackup(JSON.stringify(missingClient))).toThrow(
      /missing client/,
    );
    const missingInvoice = fixture();
    missingInvoice.payments = [payment(1, "orphan", "missing")];
    expect(() => parseBackup(JSON.stringify(missingInvoice))).toThrow(
      /missing invoice/,
    );
    const duplicates = fixture();
    duplicates.invoices.push({
      ...duplicates.invoices[0],
      id: "duplicate",
      invoiceNumber: " inv-0001 ",
    });
    expect(() => parseBackup(JSON.stringify(duplicates))).toThrow(
      /Duplicate invoice numbers/,
    );
  });

  it("rejects invalid dates, currencies, amounts, and discounts", () => {
    const invalidDate = fixture();
    invalidDate.invoices[0].issueDate = "2026-02-30";
    expect(() => parseBackup(JSON.stringify(invalidDate))).toThrow(
      /valid date/,
    );
    const invalidCurrency = fixture();
    (invalidCurrency.invoices[0] as unknown as { currency: string }).currency =
      "JPY";
    expect(() => parseBackup(JSON.stringify(invalidCurrency))).toThrow(
      /Currency/,
    );
    for (const amount of [0, -1, 101, 1.005]) {
      const invalidPayment = fixture();
      invalidPayment.payments = [payment(amount)];
      expect(() => parseBackup(JSON.stringify(invalidPayment))).toThrow();
    }
    const discount = fixture();
    discount.invoices[0].discount = 101;
    expect(() => parseBackup(JSON.stringify(discount))).toThrow(
      /Discount cannot/,
    );
    const nonfinite = fixture();
    nonfinite.invoices[0].lineItems[0].quantity = Infinity;
    expect(() => parseBackup(JSON.stringify(nonfinite))).toThrow(
      /finite number/,
    );
  });
});

describe("local persistence safety", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns an empty workspace without automatically installing demo data", () => {
    vi.stubGlobal("localStorage", { getItem: () => null });
    expect(loadWorkspace()).toEqual({ data: emptyWorkspace() });
  });

  it("preserves corrupt storage so the user can recover its original bytes", () => {
    const getItem = vi.fn(() => "{broken");
    const setItem = vi.fn();
    const removeItem = vi.fn();
    vi.stubGlobal("localStorage", { getItem, setItem, removeItem });
    const result = loadWorkspace();
    expect(result.error).toMatch(/preserved/);
    expect(result.data.invoices).toHaveLength(0);
    expect(setItem).not.toHaveBeenCalled();
    expect(removeItem).not.toHaveBeenCalled();
  });

  it("writes the validated workspace directly and reports storage failure", () => {
    const setItem = vi.fn();
    vi.stubGlobal("localStorage", { setItem });
    const workspace = fixture();
    saveWorkspace(workspace);
    expect(setItem).toHaveBeenCalledWith(
      STORAGE_KEY,
      JSON.stringify(workspace),
    );
    setItem.mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    expect(() => saveWorkspace(workspace)).toThrow(/could not be saved/);
  });
});
