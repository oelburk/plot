import { expect, it } from 'vitest';
import { uid } from './types';

it('makes 8 hex characters', () => {
  expect(uid()).toMatch(/^[0-9a-f]{8}$/);
});
