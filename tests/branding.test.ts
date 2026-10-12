import { afterEach, describe, expect, it, vi } from "vitest";
import { mergeWorkspace, parseBackup } from "../src/lib/backup";
import {
  BRAND_ACCENT_PRESETS,
  DEFAULT_INVOICE_ACCENT,
  MAX_BUSINESS_LOGO_DATA_URL_LENGTH,
  brandingColors,
  businessInitials,
  invoiceAccent,
  isSafeBusinessLogo,
} from "../src/lib/branding";
import { emptyWorkspace } from "../src/lib/seed";
import { loadWorkspace, saveWorkspace, STORAGE_KEY } from "../src/lib/storage";
import type { Workspace } from "../src/lib/types";

// Actual one-pixel PNG, JPEG, and WebP images, rather than external URLs or browser resources.
const png =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGMoTbgNAAL+AbEVvAxxAAAAAElFTkSuQmCC";
const jpeg =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwCnRRRX2gH/2Q==";
const webp =
  "data:image/webp;base64,UklGRjIAAABXRUJQVlA4ICYAAAAwAQCdASoBAAEAAUAmJaAAA3AA/uLgv//qDP/9Wh//y0P1uAAAAA==";

function brandedWorkspace(): Workspace {
  const data = emptyWorkspace();
  data.settings.businessName = "Riverbank Design";
  data.settings.businessLogo = png;
  data.settings.businessTagline = "Thoughtful design for growing businesses";
  data.settings.invoiceAccentColor = "#147d83";
  return data;
}

// WCAG relative luminance reference calculation, used to verify generated text tokens.
function contrast(first: string, second: string): number {
  const luminance = (color: string) => {
    const channels = [1, 3, 5].map((index) => {
      const value = Number.parseInt(color.slice(index, index + 2), 16) / 255;
      return value <= 0.04045
        ? value / 12.92
        : ((value + 0.055) / 1.055) ** 2.4;
    });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  const a = luminance(first),
    b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

describe("branding compatibility and persistence", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("leaves legacy settings exactly shaped when loading, parsing, and saving", () => {
    const legacy = emptyWorkspace();
    const raw = JSON.stringify(legacy);
    const setItem = vi.fn();
    vi.stubGlobal("localStorage", { getItem: () => raw, setItem });
    const loaded = loadWorkspace();
    expect(loaded.error).toBeUndefined();
    expect(JSON.stringify(loaded.data)).toBe(raw);
    expect(Object.keys(loaded.data.settings)).toEqual(
      Object.keys(legacy.settings),
    );
    expect(loaded.data.settings).not.toHaveProperty("businessLogo");
    expect(loaded.data.settings).not.toHaveProperty("businessTagline");
    expect(loaded.data.settings).not.toHaveProperty("invoiceAccentColor");
    expect(JSON.stringify(parseBackup(raw))).toBe(raw);
    saveWorkspace(loaded.data);
    expect(setItem).toHaveBeenCalledWith(STORAGE_KEY, raw);
  });

  it("round-trips all branding through browser persistence and backups", () => {
    const data = brandedWorkspace();
    let raw = "";
    vi.stubGlobal("localStorage", {
      setItem: (_key: string, value: string) => {
        raw = value;
      },
      getItem: () => raw,
    });
    saveWorkspace(data);
    expect(loadWorkspace().data.settings).toEqual(data.settings);
    expect(parseBackup(raw)).toEqual(data);
  });

  it("uses render-only defaults without turning unconfigured branding into populated settings", () => {
    const data = emptyWorkspace();
    const before = JSON.stringify(data);
    expect(invoiceAccent(data.settings.invoiceAccentColor)).toBe(
      DEFAULT_INVOICE_ACCENT,
    );
    expect(brandingColors(data.settings.invoiceAccentColor).accent).toBe(
      DEFAULT_INVOICE_ACCENT,
    );
    expect(JSON.stringify(data)).toBe(before);
  });

  it("retains each populated current branding field during merge, regardless of backup values", () => {
    const current = brandedWorkspace();
    const backup = brandedWorkspace();
    backup.settings.businessName = "Imported business";
    backup.settings.businessLogo = webp;
    backup.settings.businessTagline = "Imported tagline";
    backup.settings.invoiceAccentColor = "#ffffff";
    backup.settings.currency = "EUR";
    backup.settings.email = "backup@example.com";
    const before = JSON.stringify(current);
    expect(mergeWorkspace(current, backup).settings).toEqual(current.settings);
    expect(JSON.stringify(current)).toBe(before);
  });

  it("fills absent and empty branding field by field while preserving all other current settings", () => {
    const current = emptyWorkspace();
    current.settings.businessName = "";
    current.settings.businessLogo = "";
    current.settings.businessTagline = "   ";
    current.settings.invoiceAccentColor = "";
    current.settings.theme = "dark";
    current.settings.invoicePrefix = "MY";
    const backup = brandedWorkspace();
    const merged = mergeWorkspace(current, backup);
    expect(merged.settings).toEqual({
      ...current.settings,
      businessName: backup.settings.businessName,
      businessLogo: png,
      businessTagline: backup.settings.businessTagline,
      invoiceAccentColor: backup.settings.invoiceAccentColor,
    });
    const missing = emptyWorkspace();
    expect(mergeWorkspace(missing, backup).settings.businessLogo).toBe(png);
    expect(mergeWorkspace(missing, backup).settings.businessName).toBe(
      missing.settings.businessName,
    );
  });

  it("does not materialize new branding keys when both workspaces are unconfigured", () => {
    const current = emptyWorkspace(),
      backup = emptyWorkspace();
    expect(mergeWorkspace(current, backup).settings).toEqual(current.settings);
    expect(Object.keys(mergeWorkspace(current, backup).settings)).toEqual(
      Object.keys(current.settings),
    );
  });

  it("preserves exact backup branding for replacement and exact previous branding for rollback", () => {
    const current = brandedWorkspace();
    const snapshot = JSON.stringify(current);
    const replacement = brandedWorkspace();
    replacement.settings.businessLogo = jpeg;
    replacement.settings.businessName = "A different business";
    replacement.settings.businessTagline = "";
    replacement.settings.invoiceAccentColor = "#ffffff";
    expect(parseBackup(JSON.stringify(replacement))).toEqual(replacement);
    expect(parseBackup(snapshot)).toEqual(current);
    const olderBackup = emptyWorkspace();
    expect(
      parseBackup(JSON.stringify(olderBackup)).settings,
    ).not.toHaveProperty("businessLogo");
  });
});

describe("safe branding validation", () => {
  it("accepts optional fields, empty strings, and all three supported raster formats", () => {
    for (const logo of ["", png, jpeg, webp]) {
      expect(isSafeBusinessLogo(logo)).toBe(true);
      const data = emptyWorkspace();
      data.settings.businessLogo = logo;
      data.settings.businessTagline = "";
      data.settings.invoiceAccentColor = "";
      expect(() => parseBackup(JSON.stringify(data))).not.toThrow();
    }
  });

  it.each([
    "https://example.com/logo.png",
    "http://example.com/logo.png",
    "blob:https://example.com/unsafe",
    "javascript:alert(1)",
    "data:text/html;base64,PHNjcmlwdD4=",
    "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=",
    "data:image/png;charset=utf-8;base64,AAAA",
    "data:image/png;base64,%%%%",
    "data:image/png;base64,not-an-image",
    "data:image/png;base64,AAAA",
    "data:image/png;base64, iVBORw0K",
    "data:image/png;base64,aQ=",
    "data:image/gif;base64,R0lGODlh",
    png.replace("image/png", "image/jpeg"),
    webp.replace("image/webp", "image/png"),
    `data:image/png;base64,${"A".repeat(MAX_BUSINESS_LOGO_DATA_URL_LENGTH)}`,
  ])("rejects unsafe, oversized, or mismatched logo data (%#)", (logo) => {
    expect(isSafeBusinessLogo(logo)).toBe(false);
    const data = emptyWorkspace();
    data.settings.businessLogo = logo;
    expect(() => parseBackup(JSON.stringify(data))).toThrow(/Business logo/);
  });

  it("rejects incorrect branding field types and overlong taglines", () => {
    for (const [field, value] of [
      ["businessLogo", null],
      ["businessLogo", { src: png }],
      ["businessTagline", 123],
      ["businessTagline", "a".repeat(161)],
      ["invoiceAccentColor", false],
      ["invoiceAccentColor", "red"],
      ["invoiceAccentColor", "#fff"],
      ["invoiceAccentColor", "#12345678"],
      ["invoiceAccentColor", "#fff; background:url(https://example.com)"],
    ] as const) {
      const data = emptyWorkspace();
      (data.settings as unknown as Record<string, unknown>)[field] = value;
      expect(() => parseBackup(JSON.stringify(data))).toThrow();
    }
    const data = emptyWorkspace();
    data.settings.businessTagline = "a".repeat(160);
    expect(() => parseBackup(JSON.stringify(data))).not.toThrow();
  });
});

describe("branding display helpers and accessible color tokens", () => {
  it("provides sensible initials without hard-coded demo identity", () => {
    expect(businessInitials("Northline Studio")).toBe("NS");
    expect(businessInitials("  Riverbank  Design  ")).toBe("RD");
    expect(businessInitials("Acme")).toBe("AC");
    expect(businessInitials("Z")).toBe("Z");
    expect(businessInitials(" ")).toBe("YB");
  });

  it("keeps the chosen decorative accent and returns safe defaults for invalid colors", () => {
    expect(invoiceAccent("#FF00aA")).toBe("#FF00aA");
    for (const invalid of [undefined, "", "#fff", "red", "url(example)"]) {
      expect(invoiceAccent(invalid)).toBe(DEFAULT_INVOICE_ACCENT);
    }
    expect(BRAND_ACCENT_PRESETS.map((preset) => preset.name)).toEqual([
      "Indigo",
      "Navy",
      "Teal",
      "Emerald",
      "Burgundy",
      "Charcoal",
    ]);
  });

  it("keeps normal text readable against both branded and base surfaces for presets and custom extremes", () => {
    const colors = [
      ...BRAND_ACCENT_PRESETS.map((preset) => preset.color),
      "#ffffff",
      "#000000",
      "#ffff00",
      "#00ff00",
      "#ff00ff",
      "#00ffff",
      "#0000ff",
      "#ff0000",
    ];
    for (let index = 0; index < 64; index += 1) {
      colors.push(
        `#${((index * 2654435761) & 0xffffff).toString(16).padStart(6, "0")}`,
      );
    }
    for (const color of colors) {
      const tokens = brandingColors(color);
      expect(tokens.accent).toBe(color);
      expect(contrast(tokens.lightInk, "#ffffff")).toBeGreaterThanOrEqual(4.5);
      expect(
        contrast(tokens.lightInk, tokens.lightSurface),
      ).toBeGreaterThanOrEqual(4.5);
      expect(contrast(tokens.darkInk, "#20212d")).toBeGreaterThanOrEqual(4.5);
      expect(
        contrast(tokens.darkInk, tokens.darkSurface),
      ).toBeGreaterThanOrEqual(4.5);
    }
    expect(brandingColors("#ffffff").lightSurface).toBe("#ffffff");
    expect(brandingColors("#000000").darkSurface).toBe("#1d1e29");
  });
});
