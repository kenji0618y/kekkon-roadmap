import type { AppSettings } from '../types';

type Props = {
  settings: AppSettings;
  onChange: (key: keyof AppSettings, value: boolean) => void;
  compact?: boolean;
};

export function Toggles({ settings, onChange, compact }: Props) {
  return (
    <div className={`toggles${compact ? ' compact' : ''}`} role="group" aria-label="分岐トグル">
      <button
        type="button"
        className={`toggle child${settings.hasChild ? ' on' : ''}`}
        onClick={() => onChange('hasChild', !settings.hasChild)}
        aria-pressed={settings.hasChild}
      >
        子あり予定
      </button>
      <button
        type="button"
        className={`toggle buy${settings.buyingHome ? ' on' : ''}`}
        onClick={() => onChange('buyingHome', !settings.buyingHome)}
        aria-pressed={settings.buyingHome}
      >
        家を買う予定
      </button>
    </div>
  );
}
