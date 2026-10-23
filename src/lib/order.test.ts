import { expect, it } from 'vitest';
import { insertAt } from './order';

it('places an item before or after a reference, ignoring its own slot', () => {
  const ids = ['a', 'b', 'c', 'd'];
  expect(insertAt(ids, 'a', 'c', false)).toBe(1);
  expect(insertAt(ids, 'a', 'c', true)).toBe(2);
  expect(insertAt(ids, 'd', 'a', false)).toBe(0);
  expect(insertAt(ids, 'b', 'd', true)).toBe(3);
  expect(insertAt(ids, 'x', 'b', true)).toBe(2);
});
