import { canSwitchEnvironment, chooseEnvironment, environment, type Environment } from './environment';

const CHOICES: { id: Environment; label: string }[] = [
  { id: 'live', label: 'Live' },
  { id: 'staging', label: 'Staging' },
];

/** Live / Staging: which server this panel talks to. Hidden where there is no choice (development). */
export function EnvironmentSwitch() {
  if (!canSwitchEnvironment) return null;
  return (
    <div className="env-switch">
      <div className="caption" id="env-label">Server</div>
      <div className="seg" role="group" aria-labelledby="env-label">
        {CHOICES.map((c) => (
          <button key={c.id} type="button" className={environment === c.id ? 'is-on' : undefined} aria-pressed={environment === c.id} onClick={() => environment !== c.id && chooseEnvironment(c.id)}>
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Shown on every screen while staging is chosen, so a test account is never mistaken for a live shop. */
export function StagingBanner() {
  if (!canSwitchEnvironment || environment !== 'staging') return null;
  return (
    <div className="env-banner" role="status">
      <strong>Staging.</strong> Accounts made here are for testing. They never reach live shops, and live shops never appear here.
    </div>
  );
}
