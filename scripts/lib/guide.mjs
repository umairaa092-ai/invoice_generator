const escape = (value) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
const inline = (value) =>
  escape(value)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2">$1</a>');

/** Render the headings, paragraphs, lists and tables used in our buyer guides. */
export function guideHtml(markdown, icon, title) {
  const lines = markdown.split(/\r?\n/);
  const blocks = [];
  for (let index = 0; index < lines.length;) {
    const line = lines[index].trim();
    if (!line || line === "# Cellspray") {
      index++;
      continue;
    }
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      blocks.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      index++;
    } else if (line.startsWith("|")) {
      const rows = [];
      while (index < lines.length && lines[index].trim().startsWith("|")) {
        const cells = lines[index++]
          .trim()
          .split("|")
          .slice(1, -1)
          .map((cell) => cell.trim());
        if (cells.every((cell) => /^:?-+:?$/.test(cell))) continue;
        const tag = rows.length ? "td" : "th";
        rows.push(
          `<tr>${cells.map((cell) => `<${tag}>${inline(cell)}</${tag}>`).join("")}</tr>`,
        );
      }
      blocks.push(`<table>${rows.join("")}</table>`);
    } else if (/^(?:- |\d+\. )/.test(line)) {
      const ordered = /^\d+\./.test(line);
      const pattern = ordered ? /^\d+\.\s+(.+)$/ : /^-\s+(.+)$/;
      const items = [];
      while (index < lines.length && pattern.test(lines[index].trim())) {
        items.push(
          `<li>${inline(lines[index++].trim().replace(pattern, "$1"))}</li>`,
        );
      }
      const tag = ordered ? "ol" : "ul";
      blocks.push(`<${tag}>${items.join("")}</${tag}>`);
    } else {
      const paragraph = [];
      while (
        index < lines.length &&
        lines[index].trim() &&
        !/^(?:#|\||- |\d+\. )/.test(lines[index].trim())
      )
        paragraph.push(lines[index++].trim());
      blocks.push(`<p>${inline(paragraph.join(" "))}</p>`);
    }
  }
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escape(title)}</title><style>
  *{box-sizing:border-box}body{margin:0;color:#24283c;font-family:Arial,Helvetica,sans-serif;font-size:10.5pt;line-height:1.48}
  .brand{display:flex;gap:11px;align-items:center;border-bottom:2px solid #ab93f0;padding-bottom:12px;margin-bottom:20px}.brand svg{width:34px;height:34px}.brand-name{font-size:19pt;font-weight:700;letter-spacing:-.6px}.brand-subtitle{font-size:8.5pt;color:#677083}
  h1,h2,h3{color:#171a2b;line-height:1.23;break-after:avoid}h2{font-size:15pt;margin:23px 0 9px}h2:first-child{font-size:23pt;margin:0 0 16px;letter-spacing:-.5px}h3{font-size:11.5pt;margin:18px 0 7px}p{margin:0 0 10px;orphans:3;widows:3}ul,ol{margin:0 0 12px;padding-left:22px}li{padding-left:3px;margin:4px 0;break-inside:avoid}strong{font-weight:700}code{font-family:monospace;font-size:9pt;background:#f2eefb;padding:2px 3px}
  a{color:#5940ab;text-decoration:underline;overflow-wrap:anywhere}table{border-collapse:collapse;width:100%;margin:10px 0 15px;font-size:9.5pt}th,td{border:1px solid #dce0e7;text-align:left;vertical-align:top;padding:8px}th{background:#f2eefb;color:#29243b}tr{break-inside:avoid}
  </style></head><body><header class="brand">${icon}<div><div class="brand-name">Cellspray</div><div class="brand-subtitle">Business Tools</div></div></header><main>${blocks.join("\n")}</main></body></html>`;
}
