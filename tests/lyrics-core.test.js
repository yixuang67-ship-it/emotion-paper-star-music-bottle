const test = require('node:test');
const assert = require('node:assert/strict');
const { parseLrc, currentLyricIndex, filterSongs } = require('../lyrics-core.js');

test('parses multiple LRC timestamps and sorts lyric lines by time', () => {
  assert.deepEqual(parseLrc('[00:02.50][00:03.00]second\n[00:01.00]first'), [
    { time: 1, text: 'first' },
    { time: 2.5, text: 'second' },
    { time: 3, text: 'second' }
  ]);
});

test('finds the active lyric line for playback and seek positions', () => {
  const lines = parseLrc('[00:01.00]first\n[00:03.00]second');
  assert.equal(currentLyricIndex(lines, 0), -1);
  assert.equal(currentLyricIndex(lines, 2.99), 0);
  assert.equal(currentLyricIndex(lines, 3), 1);
});

test('filters local tracks by title or artist, case-insensitively', () => {
  const songs = [{ title: 'Good Things', artist: 'NINE PERCENT' }, { title: 'She Is', artist: 'Clazziquai' }];
  assert.deepEqual(filterSongs(songs, 'nine'), [songs[0]]);
  assert.deepEqual(filterSongs(songs, 'she'), [songs[1]]);
  assert.deepEqual(filterSongs(songs, 'missing'), []);
});

test('returns no timestamped rows for plain TXT lyrics', () => {
  assert.deepEqual(parseLrc('first line\nsecond line'), []);
});
