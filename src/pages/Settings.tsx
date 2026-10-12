import { useEffect, useRef, useState, type FormEvent } from "react";
import { Building2, Check, Info, Palette, Save } from "lucide-react";
import { useWorkspace } from "../Workspace";
import { Field } from "../components/Field";
import { BusinessBranding } from "../components/BusinessBranding";
import { currencies } from "../lib/calculations";
import type { Settings as BusinessSettings } from "../lib/types";

export default function Settings() {
  const { data, commit, toast } = useWorkspace();
  const [form, setForm] = useState<BusinessSettings>(data.settings);
  const [logoProcessing, setLogoProcessing] = useState(false);
  const previousSettings = useRef(data.settings);
  useEffect(() => {
    // Changing the header theme should not discard a business form in progress.
    const { theme: previousTheme, ...previous } = previousSettings.current;
    const { theme, ...next } = data.settings;
    if (
      previousTheme !== theme &&
      JSON.stringify(previous) === JSON.stringify(next)
    ) {
      setForm((current) => ({ ...current, theme }));
    } else {
      setForm(data.settings);
    }
    previousSettings.current = data.settings;
  }, [data.settings]);
  const dirty = JSON.stringify(form) !== JSON.stringify(data.settings);
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (logoProcessing)
      return toast("Wait for your logo to finish processing.", "error");
    if (!form.businessName.trim())
      return toast("Enter your business name.", "error");
    if (!form.invoicePrefix.trim())
      return toast("Enter an invoice prefix.", "error");
    if (
      !Number.isInteger(form.paymentTermsDays) ||
      form.paymentTermsDays < 0 ||
      form.paymentTermsDays > 365
    )
      return toast(
        "Payment terms must be a whole number between 0 and 365 days.",
        "error",
      );
    if (
      !Number.isFinite(form.taxRate) ||
      form.taxRate < 0 ||
      form.taxRate > 100
    )
      return toast("Tax rate must be between 0 and 100%.", "error");
    commit(
      {
        ...data,
        settings: {
          ...form,
          businessName: form.businessName.trim(),
          ...(form.businessTagline !== undefined
            ? { businessTagline: form.businessTagline.trim() }
            : {}),
          email: form.email.trim(),
          phone: form.phone.trim(),
          address: form.address.trim(),
          invoicePrefix: form.invoicePrefix.trim(),
          taxLabel: form.taxLabel.trim(),
          paymentInstructions: form.paymentInstructions.trim(),
        },
      },
      "Business settings saved.",
    );
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">MAKE IT YOURS</p>
          <h1>Business settings</h1>
          <p>Your business details and smart defaults for every new invoice.</p>
        </div>
        <span className="settings-local-note">
          <Check size={15} /> Stored on this device
        </span>
      </div>
      <form onSubmit={save} className="settings-layout">
        <div className="settings-main">
          <BusinessBranding
            settings={form}
            onChange={(changes) =>
              setForm((current) => ({ ...current, ...changes }))
            }
            onProcessingChange={setLogoProcessing}
          />
          <section className="panel settings-panel">
            <div className="panel-heading">
              <span className="section-icon">
                <Building2 size={19} />
              </span>
              <div>
                <h2>Business profile</h2>
                <p>
                  These details appear on your invoice preview and printed
                  invoices.
                </p>
              </div>
            </div>
            <div className="form-grid">
              <Field label="Email">
                <input
                  type="email"
                  maxLength={254}
                  value={form.email}
                  placeholder="hello@yourbusiness.com"
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
              <Field label="Business address">
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
          </section>
          <section className="panel settings-panel">
            <div className="panel-heading">
              <h2>Invoice defaults</h2>
            </div>
            <div className="form-grid">
              <Field label="Default currency">
                <select
                  value={form.currency}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      currency: event.target
                        .value as BusinessSettings["currency"],
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
                label="Invoice prefix"
                hint="Used when creating the next invoice number."
              >
                <input
                  required
                  maxLength={20}
                  value={form.invoicePrefix}
                  placeholder="INV"
                  onChange={(event) =>
                    setForm({ ...form, invoicePrefix: event.target.value })
                  }
                />
              </Field>
              <Field
                label="Default payment terms (days)"
                hint="Use 0 for payment due on receipt."
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
              <Field label="Default tax label">
                <input
                  maxLength={60}
                  value={form.taxLabel}
                  placeholder="Tax"
                  onChange={(event) =>
                    setForm({ ...form, taxLabel: event.target.value })
                  }
                />
              </Field>
              <Field label="Default tax rate (%)">
                <input
                  type="number"
                  required
                  min={0}
                  max={100}
                  step={0.01}
                  value={form.taxRate}
                  onChange={(event) =>
                    setForm({ ...form, taxRate: Number(event.target.value) })
                  }
                />
              </Field>
              <Field
                label="Payment instructions"
                hint="Added to the notes of new invoices."
              >
                <textarea
                  rows={4}
                  maxLength={4000}
                  value={form.paymentInstructions}
                  placeholder="Bank details, payment options, or a friendly thank you."
                  onChange={(event) =>
                    setForm({
                      ...form,
                      paymentInstructions: event.target.value,
                    })
                  }
                />
              </Field>
            </div>
          </section>
          <section className="panel settings-panel">
            <div className="panel-heading">
              <span className="section-icon">
                <Palette size={19} />
              </span>
              <div>
                <h2>Appearance</h2>
                <p>A workspace that feels right, day or night.</p>
              </div>
            </div>
            <Field label="Theme">
              <select
                value={form.theme}
                onChange={(event) =>
                  setForm({
                    ...form,
                    theme: event.target.value as BusinessSettings["theme"],
                  })
                }
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </Field>
          </section>
          <div className="form-actions">
            <button
              className="btn btn-secondary"
              type="button"
              disabled={!dirty || logoProcessing}
              onClick={() => setForm(data.settings)}
            >
              Discard changes
            </button>
            <button
              className="btn btn-primary"
              type="submit"
              disabled={!dirty || logoProcessing}
            >
              <Save size={17} />
              Save settings
            </button>
          </div>
        </div>
        <aside className="settings-note">
          <span className="section-icon">
            <Info size={20} />
          </span>
          <h3>Defaults for what comes next</h3>
          <p>
            Currency, tax, payment terms, and instructions apply to future
            invoices. Your existing invoice amounts and details stay as saved.
          </p>
          <p>
            Business profile details are used when previewing or printing your
            invoices.
          </p>
          <div className="settings-note-divider" />
          <h3>Your data stays with you</h3>
          <p>
            Cellspray saves everything in this browser. Download a backup
            regularly and before switching devices.
          </p>
        </aside>
      </form>
    </>
  );
}
