import { Link } from 'react-router-dom';
import { api, type Overview } from '../api';
import { actionText, ago, dateText, DEMO_STATUS, licenseBadge, monthShort, phoneText, pkr } from '../format';
import { Page } from '../Shell';
import { Badge, Empty, Kpi, LoadState, useLoad } from '../ui';

export function Dashboard() {
  const state = useLoad(api.overview, []);
  const o = state.data;
  return (
    <Page title="Dashboard" sub={o ? `Maalbaan accounts today, ${dateText(o.today)}` : 'Maalbaan accounts today'}>
      <LoadState state={state}>{o && <Content o={o} />}</LoadState>
    </Page>
  );
}

function Content({ o }: { o: Overview }) {
  const a = o.accounts;
  const working = a.active + a.expiring + a.grace;
  const maxPaid = Math.max(...o.revenue.months.map((m) => m.paidPkr), 1);
  const maxNew = Math.max(...o.revenue.months.map((m) => m.newAccounts), 1);
  const thisMonth = o.revenue.months.at(-1)!;
  const pricedNote = o.revenue.unpricedMonthly > 0 ? `${o.revenue.unpricedMonthly} ${o.revenue.unpricedMonthly === 1 ? 'account has' : 'accounts have'} no plan price yet` : 'Accounts that are working';

  return (
    <>
      <div className="kpis">
        <Kpi label="Active accounts" value={working} meta={`${a.total} in all · ${a.trial} on trial`} />
        <Kpi label="Expiring in 7 days" value={a.expiring} meta={a.grace > 0 ? `${a.grace} more in grace period` : 'Ending this week'} />
        <Kpi label="Read-only" value={a.expired} tone={a.expired > 0 ? 'danger' : undefined} meta="Licence ended, past grace" />
        <Kpi label="Suspended" value={a.suspended} tone={a.suspended > 0 ? 'danger' : undefined} meta="Paused by Maalbaan" />
      </div>
      <div className="kpis">
        <Kpi label="Monthly recurring revenue" value={pkr(o.revenue.mrrPkr)} meta={pricedNote} />
        <Kpi label="Collected this month" value={pkr(thisMonth.paidPkr)} meta="From recorded payments" />
        <Kpi label="Computers connected" value={o.devices.total} meta={`${o.devices.seenToday} seen in the last day`} />
        <Kpi label="New demo requests" value={o.demos.new} meta={`${o.demos.last30Days} in 30 days · ${o.demos.converted30Days} became accounts`} />
      </div>

      <div className="grid-2">
        <section className="mb-card">
          <div className="card-head">
            <div>
              <h2 className="h2">Payments collected</h2>
              <p className="sub">PKR by month, last 6 months</p>
            </div>
          </div>
          <div className="chart-wrap">
            <div className="bars" role="img" aria-label={`Payments collected: ${o.revenue.months.map((m) => `${monthShort(m.month)} ${pkr(m.paidPkr)}`).join(', ')}.`}>
              {o.revenue.months.map((m, i) => (
                <div className="bar" key={m.month}>
                  <span className="bar__val">{m.paidPkr ? short(m.paidPkr) : ''}</span>
                  <div className={`bar__fill${i === o.revenue.months.length - 1 ? ' is-today' : ''}`} style={{ height: `${(m.paidPkr / maxPaid) * 160}px` }} />
                </div>
              ))}
            </div>
            <div className="bar-labels" aria-hidden="true">{o.revenue.months.map((m) => <span key={m.month}>{monthShort(m.month)}</span>)}</div>
          </div>
        </section>

        <section className="mb-card">
          <div className="card-head">
            <div>
              <h2 className="h2">New accounts</h2>
              <p className="sub">Added per month, last 6 months</p>
            </div>
          </div>
          <div className="chart-wrap">
            <div className="bars" role="img" aria-label={`New accounts: ${o.revenue.months.map((m) => `${monthShort(m.month)} ${m.newAccounts}`).join(', ')}.`}>
              {o.revenue.months.map((m) => (
                <div className="bar" key={m.month}>
                  <span className="bar__val">{m.newAccounts || ''}</span>
                  <div className="bar__fill is-alt" style={{ height: `${(m.newAccounts / maxNew) * 160}px` }} />
                </div>
              ))}
            </div>
            <div className="bar-labels" aria-hidden="true">{o.revenue.months.map((m) => <span key={m.month}>{monthShort(m.month)}</span>)}</div>
          </div>
        </section>
      </div>

      <div className="split">
        <div className="main">
          <section className="mb-card">
            <div className="card-head">
              <h2 className="h2">Renewals due in 30 days</h2>
              <Link to="/accounts" className="link-btn">All accounts</Link>
            </div>
            {o.expiringSoon.length === 0 ? (
              <Empty>No account ends in the next 30 days.</Empty>
            ) : (
              <div className="list">
                {o.expiringSoon.map((d) => {
                  const b = licenseBadge(d.license, d.plan === 'trial');
                  return (
                    <div className="li" key={d.id}>
                      <div className="li__main">
                        <div className="li__title"><Link to={`/accounts/${d.id}`} className="cell-name">{d.name}</Link></div>
                        <div className="caption">{d.city ?? 'No city'} · ends {dateText(d.licenseValidUntil)}</div>
                      </div>
                      <Badge tone={b.tone}>{b.text}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="mb-card">
            <div className="card-head">
              <h2 className="h2">Latest demo requests</h2>
              <Link to="/demo-requests" className="link-btn">All requests</Link>
            </div>
            {o.recentDemos.length === 0 ? (
              <Empty>No demo requests yet. They appear here when someone fills in the form on maalbaan.com.</Empty>
            ) : (
              <div className="list">
                {o.recentDemos.map((r) => (
                  <div className="li" key={r.id}>
                    <div className="li__main">
                      <div className="li__title">{r.name}{r.shop ? ` · ${r.shop}` : ''}</div>
                      <div className="caption">{phoneText(r.phone)}{r.city ? ` · ${r.city}` : ''} · {ago(r.created_at)}</div>
                    </div>
                    <Badge tone={DEMO_STATUS[r.status].tone}>{DEMO_STATUS[r.status].label}</Badge>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="aside">
          <section className="mb-card">
            <h2 className="h2" style={{ marginBottom: 'var(--space-3)' }}>Accounts by plan</h2>
            {o.byPlan.map((p) => (
              <div className="plan-row" key={p.id}>
                <div className="row-c"><span className="label">{p.name}</span><span className="num">{p.count}</span></div>
                <div className="meter" aria-hidden="true"><div style={{ width: `${a.total ? (p.count / a.total) * 100 : 0}%` }} /></div>
              </div>
            ))}
          </section>

          <section className="mb-card">
            <div className="card-head"><h2 className="h2">Recent activity</h2><Link to="/activity" className="link-btn">All</Link></div>
            {o.activity.length === 0 ? (
              <p className="sub">Nothing yet.</p>
            ) : (
              <div className="list">
                {o.activity.map((e, i) => (
                  <div className="li" key={i}>
                    <div className="li__main">
                      <div className="li__title">{actionText(e.action)}</div>
                      <div className="caption">{e.admin_name} · {ago(e.created_at)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}

/** 36000 -> 36k, 22500 -> 22.5k, 1200000 -> 1.2M */
function short(n: number): string {
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${+(n / 1000).toFixed(1)}k`;
  return String(n);
}
