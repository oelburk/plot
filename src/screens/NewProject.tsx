import { useRef, useState, type KeyboardEvent } from 'react';
import { Modal } from '../components/Modal';
import { fieldRing } from '../components/ui';
import { isImeKey } from '../lib/focus';
import { pad, plural } from '../lib/format';
import { useStore } from '../store';

const SUGGESTIONS = ['Discovery', 'Design', 'Build', 'QA & testing', 'Launch'];

function Step({ n, label, state }: { n: number; label: string; state: 'active' | 'done' | 'todo' }) {
  return (
    <span className={`flex items-center gap-7 ${state === 'active' ? 'text-fg' : 'text-muted'}`}>
      <span
        className={`flex size-18 items-center justify-center rounded-full font-mono text-10 font-medium ${state === 'active' ? 'bg-fg text-app' : state === 'done' ? 'bg-done text-app' : 'bg-white/8 text-secondary'}`}
      >
        {n}
      </span>
      {label}
    </span>
  );
}

function Heading({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="flex flex-col gap-5">
      <span className="text-20 font-semibold tracking-[-0.02em]">{title}</span>
      <span className="text-13 text-muted">{sub}</span>
    </div>
  );
}

const field = `rounded-9 border border-white/10 bg-inset px-12 py-10 text-fg outline-none focus:border-white/18 ${fieldRing}`;

export function NewProject() {
  const { patch, createProject } = useStore.getState();
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [epics, setEpics] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const epicInput = useRef<HTMLInputElement>(null);

  const close = () => patch({ overlay: 'none' });
  const create = () => createProject(name, desc, input.trim() ? [...epics, input.trim()] : epics);
  const next = () => {
    if (!name.trim()) return;
    if (step === 1) setStep(2);
    else create();
  };
  const onEpicKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (isImeKey(e)) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      if (input.trim()) {
        setEpics([...epics, input.trim()]);
        setInput('');
      } else if (epics.length) create();
    } else if (e.key === 'Backspace' && !input && epics.length) setEpics(epics.slice(0, -1));
  };

  return (
    <Modal onClose={close} label="New project" width={540} top={84}>
      <div className="flex items-center justify-between pl-22 pr-18 pt-16">
        <div className="flex items-center gap-10 text-12">
          <Step n={1} label="Details" state={step === 1 ? 'active' : 'done'} />
          <span className="h-1 w-24 bg-white/12" />
          <Step n={2} label="Epics" state={step === 2 ? 'active' : 'todo'} />
        </div>
        <button type="button" title="Close" aria-label="Close" onClick={close} className="size-28 rounded-7 text-17 leading-none text-tertiary hover:bg-white/6 hover:text-fg">
          ×
        </button>
      </div>

      {step === 1 ? (
        <div className="flex flex-col gap-18 px-22 pb-6 pt-24">
          <Heading title="New project" sub="Give it a name. Everything can be changed later." />
          <label className="flex flex-col gap-7">
            <span className="text-12 text-secondary">Name</span>
            <input
              autoFocus
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && name.trim() && !isImeKey(e)) {
                  e.preventDefault();
                  setStep(2);
                }
              }}
              placeholder="e.g. Partner API"
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
      ) : (
        <div className="flex flex-col gap-16 px-22 pb-6 pt-24">
          <Heading title={`Key epics for ${name.trim()}`} sub="The big chunks of work. Tasks go inside each epic later." />
          <div className="flex flex-col gap-1 overflow-hidden rounded-10 border border-white/8 bg-white/6">
            {epics.map((n, i) => (
              <div key={`${n}-${i}`} className="flex items-center gap-12 bg-tree py-10 pl-14 pr-10">
                <span className="w-18 font-mono text-11 font-medium text-index">{pad(i + 1)}</span>
                <span className="flex-1 text-13.5">{n}</span>
                <button
                  type="button"
                  title="Remove"
                  aria-label={`Remove ${n}`}
                  onClick={() => {
                    setEpics(epics.filter((_, j) => j !== i));
                    epicInput.current?.focus();
                  }}
                  className="size-22 rounded-5 text-14 leading-none text-faint hover:bg-white/6 hover:text-fg"
                >
                  ×
                </button>
              </div>
            ))}
            <div className="flex items-center gap-12 bg-inset py-6 pl-14 pr-10">
              <span className="w-18 font-mono text-11 font-medium text-index">{pad(epics.length + 1)}</span>
              <input
                ref={epicInput}
                autoFocus
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onEpicKey}
                placeholder="Add an epic and press Enter"
                aria-label="Epic name"
                className={`min-w-0 flex-1 rounded-4 bg-transparent py-6 text-13.5 text-fg outline-none ${fieldRing}`}
              />
              <span className="font-mono text-10.5 font-medium text-faint">↵</span>
            </div>
          </div>
          {SUGGESTIONS.some((s) => !epics.includes(s)) && (
            <div className="flex flex-wrap items-center gap-6">
              <span className="mr-2 text-12 text-faint">Common</span>
              {SUGGESTIONS.filter((s) => !epics.includes(s)).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setEpics([...epics, s]);
                    epicInput.current?.focus();
                  }}
                  className="rounded-full border border-dashed border-white/16 px-10 py-4 text-12 text-secondary hover:border-white/30 hover:text-fg"
                >
                  + {s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-18 flex items-center justify-between gap-12 border-t border-white/6 py-16 pl-22 pr-18">
        <button type="button" onClick={step === 1 ? close : () => setStep(1)} className="rounded-8 px-12 py-7 text-13 text-secondary hover:bg-white/5 hover:text-fg">
          {step === 1 ? 'Cancel' : '← Back'}
        </button>
        <div className="flex items-center gap-12">
          {step === 2 && <span className="text-12 text-faint">{plural(epics.length, 'epic')}</span>}
          <button type="button" onClick={next} aria-disabled={!name.trim()} className={`rounded-8 bg-fg px-14 py-8 text-13 font-medium text-app ${name.trim() ? 'hover:bg-white' : 'opacity-40'}`}>
            {step === 1 ? 'Continue' : 'Create project'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
