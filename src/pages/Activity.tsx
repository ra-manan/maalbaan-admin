import { api } from '../api';
import { actionText, dayTime } from '../format';
import { Page } from '../Shell';
import { Empty, LoadState, useLoad } from '../ui';

export function Activity() {
  const state = useLoad(api.audit, []);
  const entries = state.data?.entries ?? [];
  return (
    <Page title="Activity log" sub="Who did what in this panel. The last 100 actions.">
      <LoadState state={state}>
        {entries.length === 0 ? (
          <Empty>Nothing has happened yet.</Empty>
        ) : (
          <div className="mb-table-wrap tbl-scroll">
            <table className="mb-table">
              <thead><tr><th>When</th><th>Who</th><th>What</th><th>Detail</th></tr></thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id}>
                    <td>{dayTime(e.created_at)}</td>
                    <td>{e.admin_name}</td>
                    <td>{actionText(e.action)}</td>
                    <td>{e.detail ?? <span className="muted">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </LoadState>
    </Page>
  );
}
