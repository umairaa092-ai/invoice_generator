import { useEffect, useRef, useState, type DragEvent } from "react";
import {
  ImagePlus,
  Palette,
  RotateCcw,
  Trash2,
  Upload,
  Check,
} from "lucide-react";
import { Field } from "./Field";
import { BusinessLogo } from "./BusinessLogo";
import type { Settings } from "../lib/types";
import { processBusinessLogo } from "../lib/logoProcessing";
import {
  BRAND_ACCENT_PRESETS,
  DEFAULT_INVOICE_ACCENT,
  invoiceAccent,
} from "../lib/branding";
import { useWorkspace } from "../Workspace";

export function BusinessBranding({
  settings,
  onChange,
  onProcessingChange,
}: {
  settings: Settings;
  onChange: (changes: Partial<Settings>) => void;
  onProcessingChange: (processing: boolean) => void;
}) {
  const { toast, confirm } = useWorkspace();
  const input = useRef<HTMLInputElement>(null),
    request = useRef(0),
    dragDepth = useRef(0);
  const [dragging, setDragging] = useState(false),
    [processing, setProcessing] = useState(false);
  useEffect(
    () => () => {
      request.current += 1;
    },
    [],
  );
  const selected = invoiceAccent(settings.invoiceAccentColor);
  async function upload(file?: File) {
    if (!file) return;
    const current = ++request.current;
    setProcessing(true);
    onProcessingChange(true);
    try {
      const logo = await processBusinessLogo(file);
      if (current !== request.current) return;
      onChange({ businessLogo: logo });
      toast("Logo ready. Save settings to apply your branding.");
    } catch (error) {
      if (current === request.current)
        toast(
          error instanceof Error
            ? error.message
            : "The logo could not be processed. Please try another image.",
          "error",
        );
    } finally {
      if (current === request.current) {
        setProcessing(false);
        onProcessingChange(false);
      }
    }
  }
  function drop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    if (event.dataTransfer.files.length > 1)
      return toast("Choose one business logo at a time.", "error");
    void upload(event.dataTransfer.files[0]);
  }
  function reset() {
    confirm({
      title: "Reset business branding?",
      message:
        "This removes your logo and tagline and restores the default invoice accent. Your business name and contact details will be kept. Save settings to apply the reset.",
      confirmLabel: "Reset branding",
      onConfirm: () =>
        onChange({
          businessLogo: "",
          businessTagline: "",
          invoiceAccentColor: DEFAULT_INVOICE_ACCENT,
        }),
    });
  }
  return (
    <section
      className="panel settings-panel branding-panel"
      aria-labelledby="branding-heading"
    >
      <div className="panel-heading">
        <span className="section-icon">
          <Palette size={19} />
        </span>
        <div>
          <h2 id="branding-heading">Business Branding</h2>
          <p>Your identity, on every invoice. Set it once and make it yours.</p>
        </div>
      </div>
      <div className="branding-grid">
        <div className="branding-upload">
          <div
            className={`logo-dropzone ${dragging ? "drag-active" : ""}`}
            role="group"
            aria-label="Business logo upload"
            aria-busy={processing}
            onDragEnter={(e) => {
              e.preventDefault();
              dragDepth.current += 1;
              setDragging(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "copy";
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              dragDepth.current = Math.max(0, dragDepth.current - 1);
              if (!dragDepth.current) setDragging(false);
            }}
            onDrop={drop}
          >
            <span className="logo-upload-icon">
              <ImagePlus size={25} />
            </span>
            <strong>
              {processing
                ? "Preparing your logo…"
                : "Drag & drop your logo here"}
            </strong>
            <span>or</span>
            <button
              type="button"
              className="btn btn-secondary btn-small"
              disabled={processing}
              onClick={() => input.current?.click()}
            >
              <Upload size={15} />
              {settings.businessLogo ? "Change logo" : "Choose image"}
            </button>
            <span className="logo-upload-help">
              PNG, JPG or WEBP · Max 2 MB
            </span>
            <input
              ref={input}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              aria-label="Upload business logo"
              hidden
              disabled={processing}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                void upload(file);
              }}
            />
          </div>
          <div className="logo-upload-actions">
            <span className="logo-file-status">
              {settings.businessLogo ? (
                <>
                  <Check size={14} />
                  Logo added
                </>
              ) : (
                "Optimized privately in your browser"
              )}
            </span>
            {settings.businessLogo && (
              <button
                type="button"
                className="btn btn-danger btn-small"
                disabled={processing}
                onClick={() => onChange({ businessLogo: "" })}
              >
                <Trash2 size={14} />
                Remove logo
              </button>
            )}
          </div>
        </div>
        <div className="branding-preview-card">
          <span className="branding-preview-label">YOUR BUSINESS IDENTITY</span>
          <BusinessLogo
            logo={settings.businessLogo}
            name={settings.businessName}
            className="branding-preview-logo"
          />
          <strong className="branding-preview-name">
            {settings.businessName.trim() || "Your Business"}
          </strong>
          {settings.businessTagline?.trim() && (
            <span className="branding-preview-tagline">
              {settings.businessTagline}
            </span>
          )}
          <span className="branding-preview-caption">
            Used in your workspace and customer invoices.
          </span>
          <span
            className="branding-preview-accent"
            style={{ background: selected }}
          />
        </div>
      </div>
      <div className="form-grid branding-fields">
        <Field label="Business name">
          <input
            required
            maxLength={160}
            value={settings.businessName}
            placeholder="Your business or full name"
            onChange={(e) => onChange({ businessName: e.target.value })}
          />
        </Field>
        <Field label="Business tagline (optional)">
          <input
            maxLength={160}
            value={settings.businessTagline ?? ""}
            placeholder="e.g. Independent creative studio"
            onChange={(e) => onChange({ businessTagline: e.target.value })}
          />
        </Field>
      </div>
      <fieldset className="invoice-accent-field">
        <legend>Invoice accent color</legend>
        <div className="accent-presets">
          {BRAND_ACCENT_PRESETS.map((preset) => (
            <button
              type="button"
              key={preset.name}
              className={`accent-swatch ${selected.toLowerCase() === preset.color.toLowerCase() ? "selected" : ""}`}
              aria-label={`${preset.name} invoice accent`}
              aria-pressed={
                selected.toLowerCase() === preset.color.toLowerCase()
              }
              onClick={() => onChange({ invoiceAccentColor: preset.color })}
            >
              <i style={{ background: preset.color }} />
              {preset.name}
              {selected.toLowerCase() === preset.color.toLowerCase() && (
                <Check size={12} />
              )}
            </button>
          ))}
        </div>
        <div className="accent-custom">
          <Field label="Custom invoice color">
            <input
              type="color"
              value={selected}
              onChange={(e) => onChange({ invoiceAccentColor: e.target.value })}
            />
          </Field>
          <Field
            label="Invoice color hex"
            hint="Use a six-digit color, such as #245D72."
          >
            <input
              value={settings.invoiceAccentColor ?? DEFAULT_INVOICE_ACCENT}
              maxLength={7}
              placeholder="#7560DB"
              pattern="#[0-9a-fA-F]{6}"
              onChange={(e) => onChange({ invoiceAccentColor: e.target.value })}
            />
          </Field>
        </div>
        <p className="branding-hint">
          Your color adds a subtle accent. Invoice text adjusts for readable
          contrast; Billora’s app colors stay consistent.
        </p>
      </fieldset>
      <div className="branding-reset">
        <span className="branding-hint">
          Save settings below to apply changes everywhere.
        </span>
        <button
          type="button"
          className="btn btn-secondary btn-small"
          disabled={processing}
          onClick={reset}
        >
          <RotateCcw size={14} />
          Reset branding
        </button>
      </div>
    </section>
  );
}
