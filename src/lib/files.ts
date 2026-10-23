import { invoke, isTauri } from '@tauri-apps/api/core';
import { message, save } from '@tauri-apps/plugin-dialog';

export async function saveTextFile(name: string, text: string, mime: string): Promise<void> {
  if (isTauri()) {
    const path = await save({ defaultPath: name });
    if (!path) return;
    try {
      await invoke('write_text_file', { path, contents: text });
    } catch (error) {
      await message(`Couldn't save the file. ${error}`, { kind: 'error' });
    }
    return;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: mime }));
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
