import { useMemo, useState, type FormEvent } from "react";
import {
  Building2,
  Mail,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { useWorkspace } from "../Workspace";
import { Field } from "../components/Field";
import { Modal } from "../components/Modal";
import { currencies, invoiceSummary, money, uid } from "../lib/calculations";
import type { Client, Currency } from "../lib/types";

type ClientForm = Pick<
  Client,
  "name" | "email" | "phone" | "address" | "currency" | "paymentTermsDays"
>;

export default function Clients() {
  const { data, commit, toast, confirm, openInvoice } = useWorkspace();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Client | null | undefined>();
  const [form, setForm] = useState<ClientForm>({
    name: "",
    email: "",
    phone: "",
    address: "",
    currency: data.settings.currency,
    paymentTermsDays: data.settings.paymentTermsDays,
  });
  const visibleClients = useMemo(
    () =>
      data.clients
        .filter((client) =>
          `${client.name} ${client.email} ${client.phone} ${client.address}`
            .toLowerCase()
            .includes(search.toLowerCase()),
        )
        .sort((a, b) => a.name.localeCompare(b.name)),
    [data.clients, search],
  );

  function edit(client: Client | null) {
    setForm(
      client
        ? {
            name: client.name,
            email: client.email,
            phone: client.phone,
            address: client.address,
            currency: client.currency,
            paymentTermsDays: client.paymentTermsDays,
          }
        : {
            name: "",
            email: "",
            phone: "",
            address: "",
            currency: data.settings.currency,
            paymentTermsDays: data.settings.paymentTermsDays,
          },
    );
    setEditing(client);
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name.trim())
      return toast("Enter a client or company name.", "error");
    if (
      !Number.isInteger(form.paymentTermsDays) ||
      form.paymentTermsDays < 0 ||
      form.paymentTermsDays > 365
    )
      return toast(
        "Payment terms must be a whole number between 0 and 365 days.",
        "error",
      );
    const now = new Date().toISOString();
    const client: Client = {
      ...form,
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      id: editing?.id ?? uid(),
      createdAt: editing?.createdAt ?? now,
      updatedAt: now,
    };
    const clients = editing
      ? data.clients.map((existing) =>
          existing.id === editing.id ? client : existing,
        )
      : [...data.clients, client];
    if (
      commit(
        { ...data, clients },
        editing ? "Client updated." : "Client added.",
      )
    )
      setEditing(undefined);
  }

  function deleteClient(client: Client) {
    const invoiceIds = new Set(
      data.invoices
        .filter((invoice) => invoice.clientId === client.id)
        .map((invoice) => invoice.id),
    );
    const paymentCount = data.payments.filter((payment) =>
      invoiceIds.has(payment.invoiceId),
    ).length;
    confirm({
      title: `Delete ${client.name}?`,
      message: `Deleting this client will also delete ${invoiceIds.size} invoice${invoiceIds.size === 1 ? "" : "s"} and ${paymentCount} payment${paymentCount === 1 ? "" : "s"}. This cannot be undone. Download a backup first if you need to keep these records.`,
      confirmLabel: "Delete client",
      onConfirm: () => {
        commit(
          {
            ...data,
            clients: data.clients.filter((item) => item.id !== client.id),
            invoices: data.invoices.filter((item) => !invoiceIds.has(item.id)),
            payments: data.payments.filter(
              (item) => !invoiceIds.has(item.invoiceId),
            ),
          },
          "Client and linked records deleted.",
        );
      },
    });
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">YOUR BUSINESS NETWORK</p>
          <h1>Clients</h1>
          <p>Keep good company. All your client details in one place.</p>
        </div>
        <button className="btn btn-primary" onClick={() => edit(null)}>
          <Plus size={18} /> Add client
        </button>
      </div>
      <div className="panel">
        <div className="table-toolbar">
          <div className="panel-heading">
            <h2>Client directory</h2>
            <span className="count-badge">{data.clients.length}</span>
          </div>
          <label className="search-control">
            <Search size={17} />
            <input
              aria-label="Search clients"
              placeholder="Search clients…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
        </div>
        {visibleClients.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Contact</th>
                  <th>Billing address</th>
                  <th>Invoices</th>
                  <th>Outstanding</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleClients.map((client) => {
                  const invoices = data.invoices.filter(
                    (invoice) => invoice.clientId === client.id,
                  );
                  const balances = new Map<Currency, number>();
                  for (const invoice of invoices) {
                    const balance = invoiceSummary(
                      invoice,
                      data.payments,
                    ).balance;
                    balances.set(
                      invoice.currency,
                      (balances.get(invoice.currency) ?? 0) + balance,
                    );
                  }
                  if (!balances.size) balances.set(client.currency, 0);
                  return (
                    <tr key={client.id}>
                      <td>
                        <div className="client-identity">
                          <span className="avatar">
                            {client.name
                              .split(/\s+/)
                              .slice(0, 2)
                              .map((part) => part[0])
                              .join("")
                              .toUpperCase()}
                          </span>
                          <div>
                            <strong>{client.name}</strong>
                            <span className="cell-subtext">
                              {client.currency} ·{" "}
                              {client.paymentTermsDays === 0
                                ? "Due on receipt"
                                : `Net ${client.paymentTermsDays}`}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div>{client.email || "—"}</div>
                        <span className="cell-subtext">
                          {client.phone || "No phone added"}
                        </span>
                      </td>
                      <td className="address-cell">{client.address || "—"}</td>
                      <td>{invoices.length}</td>
                      <td>
                        <div className="balance-list">
                          {[...balances]
                            .sort(([a], [b]) => a.localeCompare(b))
                            .map(([currency, amount]) => (
                              <span key={currency}>
                                <strong>{money(amount, currency)}</strong>
                                <small>{currency}</small>
                              </span>
                            ))}
                        </div>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="icon-btn action-edit"
                            aria-label={`Edit ${client.name}`}
                            title="Edit client"
                            onClick={() => edit(client)}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            className="icon-btn action-delete"
                            aria-label={`Delete ${client.name}`}
                            title="Delete client"
                            onClick={() => deleteClient(client)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <Users size={34} />
            <h3>
              {search
                ? "No clients found"
                : "Your next great client starts here"}
            </h3>
            <p>
              {search
                ? "Try a different name, email, or address."
                : "Add a client here, or create one while making your first invoice."}
            </p>
            <button
              className="btn btn-secondary"
              onClick={() => (search ? setSearch("") : openInvoice())}
            >
              {search ? "Clear search" : "Create an invoice"}
            </button>
          </div>
        )}
        {data.clients.length > 0 && (
          <div className="panel-footer">
            <Mail size={15} />
            <span>
              Balances stay in their original invoice currency. No exchange
              rates are applied.
            </span>
          </div>
        )}
      </div>
      {editing !== undefined && (
        <Modal
          title={editing ? "Edit client" : "Add a client"}
          subtitle="A few details now make your next invoice effortless."
          onClose={() => setEditing(undefined)}
        >
          <form onSubmit={save}>
            <div className="form-grid">
              <Field label="Client / company name">
                <input
                  autoFocus
                  required
                  maxLength={160}
                  value={form.name}
                  placeholder="e.g. Studio North"
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                />
              </Field>
              <Field label="Email">
                <input
                  type="email"
                  maxLength={254}
                  value={form.email}
                  placeholder="billing@company.com"
                  onChange={(event) =>
                    setForm({ ...form, email: event.target.value })
                  }
                />
              </Field>
              <Field label="Phone">
                <input
                  type="tel"
                  maxLength={60}
                  value={form.phone}
                  placeholder="+1 (555) 000-0000"
                  onChange={(event) =>
                    setForm({ ...form, phone: event.target.value })
                  }
                />
              </Field>
              <Field label="Default currency">
                <select
                  value={form.currency}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      currency: event.target.value as Client["currency"],
                    })
                  }
                >
                  {currencies.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                label="Payment terms (days)"
                hint="Use 0 for invoices due on receipt."
              >
                <input
                  type="number"
                  required
                  min={0}
                  max={365}
                  step={1}
                  value={form.paymentTermsDays}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      paymentTermsDays: Number(event.target.value),
                    })
                  }
                />
              </Field>
              <Field label="Billing address">
                <textarea
                  rows={3}
                  maxLength={1000}
                  value={form.address}
                  placeholder="Street, city, postal code, country"
                  onChange={(event) =>
                    setForm({ ...form, address: event.target.value })
                  }
                />
              </Field>
            </div>
            <div className="form-actions">
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => setEditing(undefined)}
              >
                Cancel
              </button>
              <button className="btn btn-primary" type="submit">
                <Building2 size={17} />
                {editing ? "Save changes" : "Add client"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
