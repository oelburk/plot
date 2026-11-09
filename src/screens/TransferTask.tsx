import { ChevronDown } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Modal } from '../components/Modal';
import { focusUndo } from '../lib/focus';
import { allTasks } from '../lib/progress';
import type { Project } from '../lib/types';
import { currentProject, useStore } from '../store';
import { field, Heading } from './NewProject';

/** Projects a task in `pid` can move or copy to: any other project with an epic to land in. */
export const transferTargets = (projects: Project[], pid: string | undefined) =>
  projects.filter((p) => p.id !== pid && p.epics.length);

export function TransferTask() {
  const from = useStore(currentProject);
  const projects = useStore((s) => s.projects);
  const taskId = useStore((s) => s.transfer);
  const { patch, transferTask } = useStore.getState();
  const targets = transferTargets(projects, from?.id);
  const [pid, setPid] = useState(targets[0]?.id);
  const target = targets.find((p) => p.id === pid);
  const [eid, setEid] = useState(target?.epics[0]?.id);
  const task = from && allTasks(from).find((t) => t.id === taskId);
  if (!task || !target || !eid) return null;

  const close = () => patch({ overlay: 'none', transfer: null });
  const submit = (copy: boolean) => {
    close();
    // in the next frame, so the modal hands focus back first and Undo takes it after
    requestAnimationFrame(() => {
      transferTask(task.id, target.id, eid, copy);
      focusUndo();
    });
  };

  return (
    <Modal onClose={close} label="Move or copy task" width={460} top={84}>
      <div className="flex items-start justify-between pl-22 pr-18 pt-20">
        <Heading title="Move or copy task" sub={`"${task.title}" keeps its status, notes and comments.`} />
        <button type="button" title="Close" aria-label="Close" onClick={close} className="size-28 rounded-7 text-17 leading-none text-tertiary hover:bg-white/6 hover:text-fg">
          ×
        </button>
      </div>
      <div className="flex flex-col gap-18 px-22 pb-6 pt-22">
        <Select
          label="Project"
          value={target.id}
          onChange={(v) => {
            setPid(v);
            setEid(targets.find((p) => p.id === v)?.epics[0]?.id);
          }}
        >
          {targets.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
        <Select label="Epic" value={eid} onChange={setEid}>
          {target.epics.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="mt-18 flex items-center justify-end gap-8 border-t border-white/6 py-16 pl-22 pr-18">
        <button type="button" onClick={close} className="rounded-8 px-12 py-7 text-13 text-secondary hover:bg-white/5 hover:text-fg">
          Cancel
        </button>
        <button type="button" onClick={() => submit(true)} className="rounded-8 border border-white/10 bg-raised px-14 py-7 text-13 text-fg hover:border-white/20">
          Copy
        </button>
        <button type="button" onClick={() => submit(false)} className="rounded-8 bg-fg px-14 py-8 text-13 font-medium text-app hover:bg-white">
          Move
        </button>
      </div>
    </Modal>
  );
}

function Select({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-7">
      <span className="text-12 text-secondary">{label}</span>
      <span className="relative flex">
        <select value={value} onChange={(e) => onChange(e.target.value)} className={`${field} w-full appearance-none pr-34 text-13`}>
          {children}
        </select>
        <ChevronDown size={14} strokeWidth={1.5} className="pointer-events-none absolute right-12 top-1/2 -translate-y-1/2 text-tertiary" />
      </span>
    </label>
  );
}
