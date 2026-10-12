import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRight,
  FileText,
  Wallet,
  Clock3,
  CircleAlert,
  TrendingUp,
  Plus,
  Sparkles,
  CheckCheck,
} from "lucide-react";
import { useWorkspace } from "../Workspace";
import {
  invoiceSummary,
  money,
  totals,
  today,
  dateLabel,
  roundMoney,
} from "../lib/calculations";
import type { Currency } from "../lib/types";
import { Badge } from "../components/Badge";
import { businessInitials } from "../lib/branding";
export default function Dashboard({ currency }: { currency: Currency }) {
  const { data, setPage, openPayment, openInvoice } = useWorkspace();
  const invoices = data.invoices.filter((i) => i.currency === currency),
    ids = new Set(invoices.map((i) => i.id));
  const invoiced = roundMoney(
      invoices.reduce((sum, i) => sum + totals(i).total, 0),
    ),
    collected = roundMoney(
      data.payments
        .filter((p) => ids.has(p.invoiceId))
        .reduce((sum, p) => sum + p.amount, 0),
    );
  const outstanding = roundMoney(
    invoices.reduce(
      (sum, i) => sum + Math.max(0, invoiceSummary(i, data.payments).balance),
      0,
    ),
  );
  const overdue = roundMoney(
    invoices.reduce((sum, i) => {
      const s = invoiceSummary(i, data.payments);
      return sum + (s.status === "Overdue" ? s.balance : 0);
    }, 0),
  );
  const current = roundMoney(outstanding - overdue);
  const collectionRate = invoiced
    ? Math.round((collected / invoiced) * 100)
    : 0;
  const recent = [...invoices]
    .sort(
      (a, b) =>
        b.issueDate.localeCompare(a.issueDate) ||
        b.createdAt.localeCompare(a.createdAt),
    )
    .slice(0, 5);
  const months = Array.from({ length: 6 }, (_, index) => {
    const d = new Date(`${today()}T12:00:00Z`);
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() - 5 + index);
    const key = d.toISOString().slice(0, 7);
    return {
      label: d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }),
      key,
      total: roundMoney(
        data.payments
          .filter((p) => ids.has(p.invoiceId) && p.paymentDate.startsWith(key))
          .reduce((sum, p) => sum + p.amount, 0),
      ),
    };
  });
  const maximum = Math.max(...months.map((m) => m.total), 1),
    chartTotal = roundMoney(months.reduce((s, m) => s + m.total, 0));
  const aging = [
    { label: "1–30 days", min: 1, max: 30 },
    { label: "31–60 days", min: 31, max: 60 },
    { label: "61–90 days", min: 61, max: 90 },
    { label: "90+ days", min: 91, max: Infinity },
  ].map((bucket) => ({
    ...bucket,
    value: roundMoney(
      invoices.reduce((s, i) => {
        const days = Math.round(
          (Date.parse(today()) - Date.parse(i.dueDate)) / 86400000,
        );
        return (
          s +
          (days >= bucket.min && days <= bucket.max
            ? Math.max(0, invoiceSummary(i, data.payments).balance)
            : 0)
        );
      }, 0),
    ),
  }));
  const metricCards = [
    {
      label: "Total invoiced",
      value: invoiced,
      icon: FileText,
      color: "violet",
      note: `${invoices.length} invoices issued`,
      detail: "All time",
    },
    {
      label: "Total collected",
      value: collected,
      icon: Wallet,
      color: "green",
      note: `${collectionRate}% collection rate`,
      detail: "All time",
    },
    {
      label: "Outstanding",
      value: outstanding,
      icon: Clock3,
      color: "blue",
      note: `${invoices.filter((i) => invoiceSummary(i, data.payments).balance > 0).length} invoices awaiting payment`,
      detail: "To collect",
    },
    {
      label: "Overdue",
      value: overdue,
      icon: CircleAlert,
      color: "amber",
      note: `${invoices.filter((i) => invoiceSummary(i, data.payments).status === "Overdue").length} invoices need a follow-up`,
      detail: "Past due",
    },
  ];
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">YOUR BUSINESS, AT A GLANCE</p>
          <h1>Let’s keep things flowing.</h1>
          <p>Less time on the numbers. More time doing what you love.</p>
        </div>
        <span className="dashboard-date">
          {new Date().toLocaleDateString("en-US", {
            weekday: "short",
            month: "long",
            day: "numeric",
          })}
        </span>
      </div>
      <section className="welcome-banner">
        <div className="welcome-copy">
          <span className="welcome-label">
            <span />A clearer picture of your business
          </span>
          <h2>
            Good work deserves
            <br />
            to get paid.
          </h2>
          <p>
            Your invoices, payments, and next steps.
            <br />
            All together, without the busywork.
          </p>
          <div className="welcome-actions">
            <button className="btn btn-primary" onClick={() => openPayment()}>
              <ArrowDownLeft size={17} />
              Record payment
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => setPage("invoices")}
            >
              View invoices
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
        <div className="welcome-graphic" aria-hidden="true">
          <div className="welcome-orbit orbit-one" />
          <div className="welcome-orbit orbit-two" />
          <div className="welcome-orbit orbit-three" />
          <span className="graphic-star star-one">✦</span>
          <span className="graphic-star star-two">✦</span>
          <div className="floating-payment">
            <span className="floating-check">
              <CheckCheck size={19} />
            </span>
            <div>
              <small>PAYMENT RECEIVED</small>
              <strong>A little peace of mind.</strong>
            </div>
          </div>
          <div className="graphic-invoice">
            <span className="graphic-logo">
              {businessInitials(data.settings.businessName)}
            </span>
            <span className="graphic-invoice-label">INVOICE</span>
            <div className="graphic-line long" />
            <div className="graphic-line" />
            <div className="graphic-line short" />
            <div className="graphic-divider" />
            <div className="graphic-item">
              <span />
              <i />
            </div>
            <div className="graphic-item">
              <span />
              <i />
            </div>
            <div className="graphic-item">
              <span />
              <i />
            </div>
            <div className="graphic-total">
              All in good order <CheckCheck size={15} />
            </div>
          </div>
        </div>
      </section>
      <div className="metric-grid">
        {metricCards.map(
          ({ label, value, icon: Icon, color, note, detail }) => (
            <section className={`metric-card metric-${color}`} key={label}>
              <div className="metric-top">
                <span className="metric-label">{label}</span>
                <span className={`metric-icon ${color}`}>
                  <Icon size={18} />
                </span>
              </div>
              <div className="metric-value">
                {money(value, currency)}
                <span>{currency}</span>
              </div>
              <div className="metric-foot">
                <span>{note}</span>
                <small>{detail}</small>
              </div>
            </section>
          ),
        )}
      </div>
      <div className="dashboard-grid">
        <section className="panel collections-panel">
          <header className="panel-heading">
            <div>
              <h2>Collections overview</h2>
              <p>Payments received, month by month</p>
            </div>
            <span className="period-label">Last 6 months</span>
          </header>
          <div className="chart-summary">
            <strong>{money(chartTotal, currency)}</strong>
            <span>
              <TrendingUp size={14} />
              Collected in the last 6 months
            </span>
          </div>
          <div
            className="collection-chart"
            role="img"
            aria-label={`Monthly collections in ${currency}: ${months.map((m) => `${m.label} ${money(m.total, currency)}`).join(", ")}`}
          >
            <div className="chart-axis">
              <span>{money(maximum, currency)}</span>
              <span>{money(maximum / 2, currency)}</span>
              <span>{money(0, currency)}</span>
            </div>
            <div className="chart-plot">
              <div className="chart-grid">
                <i />
                <i />
                <i />
              </div>
              <div className="chart-bars">
                {months.map((m, index) => (
                  <div className="chart-column" key={m.key}>
                    <div className="bar-track">
                      <div
                        className={`chart-bar ${index === 5 ? "current" : ""}`}
                        style={{
                          height: `${Math.max(m.total > 0 ? 3 : 0, (m.total / maximum) * 100)}%`,
                        }}
                      >
                        <span className="chart-value">
                          {money(m.total, currency)}
                        </span>
                      </div>
                    </div>
                    <span className="chart-label">{m.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="chart-footer">
            <span className="legend-dot violet" />
            Payments received
            <span className="text-muted">Showing {currency} only</span>
          </div>
        </section>
        <section className="panel health-panel">
          <header className="panel-heading">
            <div>
              <h2>Receivables health</h2>
              <p>Where your invoices stand</p>
            </div>
            <span className="metric-icon violet">
              <Wallet size={18} />
            </span>
          </header>
          <div className="health-content">
            <div className="donut-wrap">
              <div
                className="donut"
                style={{
                  background: invoiced
                    ? `conic-gradient(var(--primary) 0 ${(collected / invoiced) * 100}%, var(--health-current) ${(collected / invoiced) * 100}% ${((collected + current) / invoiced) * 100}%, var(--health-overdue) ${((collected + current) / invoiced) * 100}% 100%)`
                    : "var(--border)",
                }}
              >
                <div className="donut-hole">
                  <strong>{collectionRate}%</strong>
                  <span>collected</span>
                </div>
              </div>
            </div>
            <div className="health-legend">
              {[
                { label: "Collected", value: collected, color: "violet" },
                { label: "Not yet due", value: current, color: "blue" },
                { label: "Overdue", value: overdue, color: "amber" },
              ].map((item) => (
                <div className="legend-row" key={item.label}>
                  <span className={`legend-dot ${item.color}`} />
                  <span>{item.label}</span>
                  <strong>{money(item.value, currency)}</strong>
                </div>
              ))}
            </div>
          </div>
          <div className="health-note">
            <Sparkles size={15} />
            {overdue
              ? "A friendly follow-up can go a long way."
              : "Looking good. Keep the momentum going."}
          </div>
        </section>
      </div>
      <section className="panel recent-panel">
        <header className="panel-heading">
          <div>
            <h2>Recent invoices</h2>
            <p>A quick look at your latest work</p>
          </div>
          <button className="table-link" onClick={() => setPage("invoices")}>
            View all invoices
            <ArrowRight size={15} />
          </button>
        </header>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Client</th>
                <th>Due date</th>
                <th className="align-right">Amount</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {recent.map((i) => {
                const client = data.clients.find((c) => c.id === i.clientId),
                  summary = invoiceSummary(i, data.payments);
                return (
                  <tr key={i.id}>
                    <td>
                      <button
                        className="invoice-number-link"
                        onClick={() => openInvoice(i)}
                      >
                        {i.invoiceNumber}
                      </button>
                    </td>
                    <td>
                      <div className="client-cell">
                        <span
                          className={`client-avatar avatar-${(client?.name.length || 0) % 4}`}
                        >
                          {client?.name
                            .split(" ")
                            .map((s) => s[0])
                            .slice(0, 2)
                            .join("")}
                        </span>
                        <div className="client-text">
                          <strong>{client?.name || "Missing client"}</strong>
                          <span>{client?.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>{dateLabel(i.dueDate)}</td>
                    <td className="align-right table-money">
                      {money(totals(i).total, currency)}
                    </td>
                    <td>
                      <Badge status={summary.status} />
                    </td>
                    <td>
                      <button
                        className="icon-btn"
                        aria-label={`Edit ${i.invoiceNumber}`}
                        onClick={() => openInvoice(i)}
                      >
                        <ArrowUpRight size={17} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!recent.length && (
            <div className="empty-state">
              <FileText size={30} />
              <h3>Your next great project starts here</h3>
              <p>
                No {currency} invoices yet. Add a client and a deposit in a
                single save.
              </p>
              <button className="btn btn-primary" onClick={() => openInvoice()}>
                <Plus size={16} />
                Create an invoice
              </button>
            </div>
          )}
        </div>
      </section>
      <section className="panel aging-panel">
        <header className="panel-heading">
          <div>
            <h2>Aging snapshot</h2>
            <p>Outstanding balances by days past due</p>
          </div>
          <span className="period-label">{currency} receivables</span>
        </header>
        <div className="aging-grid">
          {aging.map((b, index) => (
            <div className="aging-item" key={b.label}>
              <span>{b.label}</span>
              <strong className="aging-value">
                {money(b.value, currency)}
              </strong>
              <div className={`aging-track aging-${index}`}>
                <i
                  style={{
                    width: `${overdue ? (b.value / overdue) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
