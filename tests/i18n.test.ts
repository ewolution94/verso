import { test } from 'node:test';
import assert from 'node:assert/strict';
import { en } from '../src/lib/i18n/en.ts';
import { de } from '../src/lib/i18n/de.ts';

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

test('German has every key, and no extra ones', () => {
  assert.deepEqual(Object.keys(de).sort(), Object.keys(en).sort());
});

test('every German text fills the same placeholders as its English source', () => {
  for (const key of Object.keys(en) as (keyof typeof en)[]) {
    assert.deepEqual(placeholders(de[key]), placeholders(en[key]), key);
  }
});

test('plurals come in pairs', () => {
  const bases = Object.keys(en).filter((k) => k.endsWith('.one')).map((k) => k.slice(0, -4));
  for (const base of bases) assert.ok(`${base}.other` in en, base);
});
