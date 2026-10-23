import { useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Toast } from './components/Toast';
import { focusSoon, isImeKey } from './lib/focus';
import { Home } from './screens/Home';
import { NewProject } from './screens/NewProject';
import { Palette } from './screens/Palette';
import { ProjectScreen } from './screens/Project';
import { Settings } from './screens/Settings';
import { currentProject, useStore } from './store';

export default function App() {
  const screen = useStore((s) => s.screen);
  const overlay = useStore((s) => s.overlay);
  const hasProject = useStore((s) => !!currentProject(s));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isImeKey(e)) return;
      const { overlay, focus, openTask, patch } = useStore.getState();
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        patch({ overlay: overlay === 'palette' ? 'none' : 'palette' });
      } else if (e.key === 'Escape' && !document.querySelector(':popover-open')) {
        patch(overlay !== 'none' ? { overlay: 'none' } : { adding: null, addingEpic: false, openTask: null, focus: null });
        if (overlay === 'none' && (focus || openTask)) focusSoon(focus ? `[data-tile="${focus}"]` : `[data-task="${openTask}"]`);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="flex h-full overflow-hidden">
      <Sidebar />
      <main className="relative flex min-w-0 flex-1 flex-col">
        {screen === 'settings' ? <Settings /> : screen === 'project' && hasProject ? <ProjectScreen /> : <Home />}
      </main>
      {overlay === 'palette' && <Palette />}
      {overlay === 'new' && <NewProject />}
      <Toast />
    </div>
  );
}
