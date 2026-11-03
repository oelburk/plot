import { isTauri } from '@tauri-apps/api/core';
import { relaunch } from '@tauri-apps/plugin-process';
import { check } from '@tauri-apps/plugin-updater';
import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { btn } from './ui';

/** Updates only run in the built desktop app, never in `tauri dev` or a browser. */
export const canUpdate = () => isTauri() && !import.meta.env.DEV;

/** Resolves to the update, or null when this is the latest version; the sidebar card shows whatever it finds. */
export async function checkForUpdate() {
  const update = await check();
  useStore.setState({ update });
  return update;
}

export function UpdateNotice() {
  const update = useStore((s) => s.update);
  const [state, setState] = useState<'ready' | 'installing' | 'failed'>('ready');

  useEffect(() => {
    // ponytail: checks once per launch (plus Settings → Check for updates); a failed check only reaches the console
    if (canUpdate()) checkForUpdate().catch(console.error);
  }, []);
  if (!update) return null;

  const install = async () => {
    setState('installing');
    try {
      await update.downloadAndInstall();
      await relaunch();
    } catch (error) {
      console.error(error);
      setState('failed');
    }
  };

  return (
    <div role="status" className="mb-8 flex flex-col gap-10 rounded-10 border border-white/8 bg-card px-12 py-11">
      <div className="flex flex-col gap-2">
        <span className="text-12.5 font-medium text-fg">Update available</span>
        <span className="text-11.5 text-muted">
          {state === 'failed' ? "Couldn't install the update. Check your connection and try again." : `Plot ${update.version} is ready to install.`}
        </span>
      </div>
      <button type="button" onClick={install} disabled={state === 'installing'} className={`${btn.primary} disabled:opacity-60`}>
        {state === 'installing' ? 'Installing…' : state === 'failed' ? 'Try again' : 'Install and restart'}
      </button>
    </div>
  );
}
