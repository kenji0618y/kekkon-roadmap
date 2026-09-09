import {useRegisterSW} from 'virtual:pwa-register/react';
import {RefreshCw} from 'lucide-react';

/** Banner when a new service worker is waiting — reload to apply (registerType: prompt). */
export function PwaUpdateBanner() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW() {
      /* noop — registration handled by vite-plugin-pwa */
    },
    onRegisterError() {
      /* ignore in UI */
    },
  });

  if (!needRefresh) return null;

  return (
    <div className="pwa-update-banner" role="status" aria-live="polite">
      <span>更新があります。再読み込み</span>
      <button
        type="button"
        className="pwa-update-reload"
        onClick={() => void updateServiceWorker(true)}
      >
        <RefreshCw size={14} aria-hidden />
        再読み込み
      </button>
      <button
        type="button"
        className="pwa-update-dismiss"
        onClick={() => setNeedRefresh(false)}
        aria-label="閉じる"
      >
        あとで
      </button>
    </div>
  );
}

export default PwaUpdateBanner;
