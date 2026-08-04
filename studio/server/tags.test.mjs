/**
 * `readTagCategories` parses a literal out of `photos.ts` and falls back to []
 * on any failure — which degrades silently to "every tag is uncategorised".
 * These tests make that failure loud.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readLibrary } from './library.mjs';
import { readTagCategories, tagVocabulary } from './tags.mjs';

test('parses the curated categories out of photos.ts', () => {
  const categories = readTagCategories();

  assert.ok(categories.length > 0, 'no categories parsed — the literal probably moved');
  for (const category of categories) {
    assert.equal(typeof category.name, 'string');
    assert.ok(category.name.length > 0);
    assert.ok(Array.isArray(category.tags) && category.tags.length > 0, category.name);
  }

  const names = categories.map((c) => c.name);
  assert.ok(names.includes('Scene'), `expected a Scene group, got ${names.join(', ')}`);
});

test('a tag lands in the category photos.ts assigns it', () => {
  const vocabulary = tagVocabulary(readLibrary());
  const of = (tag) => vocabulary.find((t) => t.tag === tag)?.category;

  assert.equal(of('landscape'), 'Scene');
  assert.equal(of('cityscape'), 'Urban');
  assert.equal(of('sunset'), 'Light & Mood');
  assert.equal(of('flora'), 'Nature & Season');
});

test('the library is not one big pile of uncategorised tags', () => {
  const vocabulary = tagVocabulary(readLibrary());
  const other = vocabulary.filter((t) => t.category === 'Other');

  assert.ok(
    other.length < vocabulary.length / 2,
    `${other.length} of ${vocabulary.length} tags fell into Other: ${other.map((t) => t.tag).join(', ')}`
  );
});

test('counts how often each tag is used, curated-but-unused included', () => {
  const vocabulary = tagVocabulary([
    { file: 'a', title: 'A', tags: ['landscape', 'sunset'], width: 1, height: 1 },
    { file: 'b', title: 'B', tags: ['landscape'], width: 1, height: 1 },
  ]);

  assert.equal(vocabulary.find((t) => t.tag === 'landscape').count, 2);
  assert.equal(vocabulary.find((t) => t.tag === 'sunset').count, 1);
  // 'desert' is curated in photos.ts but unused here — still offered, at zero.
  assert.equal(vocabulary.find((t) => t.tag === 'desert').count, 0);
});

test('sorts by use, then alphabetically', () => {
  const vocabulary = tagVocabulary(readLibrary());
  for (let i = 1; i < vocabulary.length; i++) {
    const prev = vocabulary[i - 1];
    const curr = vocabulary[i];
    assert.ok(
      prev.count > curr.count || (prev.count === curr.count && prev.tag < curr.tag),
      `${prev.tag}(${prev.count}) should not precede ${curr.tag}(${curr.count})`
    );
  }
});
