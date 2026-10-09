const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { parseLrc } = require('../lyrics-core.js');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'script.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

test('catalog contains exactly the two requested local songs with all fields and resources', () => {
  const entries = [...source.matchAll(/\{ id: "([^"]+)", title: "([^"]+)", artist: "([^"]+)", album: "([^"]*)", duration: (\d+), src: "([^"]+)", cover: "([^"]+)", lyrics: "([^"]+)" \}/g)];
  assert.equal(entries.length, 2);
  assert.doesNotMatch(source, /nine-percent-good-things|NINE PERCENT/);
  for (const entry of entries) {
    for (const asset of entry.slice(6, 9)) assert.ok(fs.existsSync(path.join(root, asset)), `${entry[1]} missing ${asset}`);
  }
});

test('all supplied LRC files decode and contain timestamped lines', () => {
  for (const file of ['bigbang-voice.lrc', 'clazziquai-she-is.lrc']) {
    const lines = parseLrc(fs.readFileSync(path.join(root, 'assets/lyrics', file), 'utf8'));
    assert.ok(lines.length > 10, `${file} should have parsed lyric lines`);
    assert.ok(lines[0].text.length > 0);
  }
});

test('carousel uses the current cover as a CD and animates only during playback', () => {
  assert.match(html, /class="carousel-disc"/);
  assert.match(html, /\.is-playing \.carousel-disc\s*\{/);
  assert.match(html, /@keyframes cd-spin/);
  assert.doesNotMatch(html, /星辰大海/);
});

test('player exposes song selection, lyrics, and current-song bottle navigation', () => {
  for (const id of ['songPickerOpen', 'songSearch', 'clearSongSearch', 'lyricsToggle', 'lyricsPanel', 'lyricsClose', 'openBottle', 'allStars']) {
    assert.match(html, new RegExp(`id="${id}"`), `${id} control should exist`);
  }
  assert.match(html, /<script src="assets\/lyrics\/lyrics-data\.js"><\/script>/);
});
