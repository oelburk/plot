/** Index to insert `id` at so it lands before or after `ref`, counted once `id` is out of the list. */
export const insertAt = (ids: string[], id: string, ref: string, after: boolean) =>
  ids.filter((x) => x !== id).indexOf(ref) + (after ? 1 : 0);
