import { useState } from 'react';
import { Modal } from '../components/Modal';
import { isImeKey, focusUndo } from '../lib/focus';
import { currentProject, useStore } from '../store';
import { field, Heading } from './NewProject';

export function EditProject() {
  const p = useStore(currentProject);
  const { patch, updateProject, deleteProject } = useStore.getState();
  const [name, setName] = useState(p?.name ?? '');
  const [desc, setDesc] = useState(p?.desc ?? '');
  if (!p) return null;

  const close = () => patch({ overlay: 'none' });
  const save = () => {
    if (!name.trim()) return;
    updateProject(p.id, { name, desc });
    close();
  };

  return (
    <Modal onClose={close} label="Edit project" width={500} top={84}>
      <div className="flex items-start justify-between pl-22 pr-18 pt-20">
        <Heading title="Edit project" sub="Changes are saved to the project's history." />
        <button type="button" title="Close" aria-label="Close" onClick={close} className="size-28 rounded-7 text-17 leading-none text-tertiary hover:bg-white/6 hover:text-fg">
          ×
        </button>
      </div>
      <div className="flex flex-col gap-18 px-22 pb-6 pt-22">
        <label className="flex flex-col gap-7">
          <span className="text-12 text-secondary">Name</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isImeKey(e)) {
                e.preventDefault();
                save();
              }
            }}
            className={`${field} text-15`}
          />
        </label>
        <label className="flex flex-col gap-7">
          <span className="text-12 text-secondary">
            Description <span className="text-faint">· optional</span>
          </span>
          <textarea rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="One line on what this is for" className={`${field} resize-none text-13 leading-[1.5]`} />
        </label>
      </div>
      <div className="mt-18 flex items-center justify-between gap-12 border-t border-white/6 py-16 pl-22 pr-18">
        <button
          type="button"
          onClick={() => {
            close();
            // deleting in the next frame lets the modal hand focus back to its opener first, so Undo takes it after
            requestAnimationFrame(() => {
              deleteProject(p.id);
              focusUndo();
            });
          }}
          className="rounded-8 px-12 py-7 text-13 text-danger-fg hover:bg-danger/10"
        >
          Delete project
        </button>
        <div className="flex items-center gap-8">
          <button type="button" onClick={close} className="rounded-8 px-12 py-7 text-13 text-secondary hover:bg-white/5 hover:text-fg">
            Cancel
          </button>
          <button type="button" onClick={save} aria-disabled={!name.trim()} className={`rounded-8 bg-fg px-14 py-8 text-13 font-medium text-app ${name.trim() ? 'hover:bg-white' : 'opacity-40'}`}>
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
}
