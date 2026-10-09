const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { parseLrc } = require('../lyrics-core.js');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'script.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'style.css'), 'utf8');

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
  assert.match(styles, /#stage\.is-playing \.carousel-disc\s*\{/);
  assert.match(styles, /@keyframes cd-spin/);
  assert.doesNotMatch(html, /星辰大海/);
});

test('CD and album cover stay circular and square', () => {
  assert.match(styles, /\.carousel-disc\s*\{[^}]*aspect-ratio:\s*1\s*\/\s*1/s);
  assert.match(styles, /\.carousel-disc\s*\{[^}]*border-radius:\s*50%/s);
  assert.match(styles, /\.carousel-disc\s*\{[^}]*overflow:\s*hidden/s);
  assert.match(styles, /#currentCover\s*\{[^}]*aspect-ratio:\s*1\s*\/\s*1/s);
  assert.match(styles, /#currentCover\s*\{[^}]*height:\s*88%/s);
  assert.match(styles, /#currentCover\s*\{[^}]*object-fit:\s*cover/s);
});

test('tablet and phone layouts reflow to a centered single column and keep overlays in view', () => {
  assert.match(styles, /\.layout\s*\{[^}]*flex-direction:\s*column/s);
  assert.match(styles, /\.header-actions\s*\{[^}]*flex:\s*0 0 auto/s);
  assert.match(styles, /background-image:\s*url\('\.\/assets\/reference\/carousel-scene\.png'\)/);
  assert.ok(fs.existsSync(path.join(root, 'assets/reference/carousel-scene.png')));
  assert.match(styles, /@media\s*\(max-width:\s*767px\)[\s\S]*?\.carousel\s*\{[^}]*width:\s*min\(94vw,\s*430px\)/);
  assert.match(styles, /\.modal\s*\{[^}]*max-height:\s*min\(90dvh,\s*900px\)/);
  assert.match(styles, /body\s*\{[^}]*overflow-x:\s*hidden/);
});

test('player exposes song selection, lyrics, and current-song bottle navigation', () => {
  for (const id of ['songPickerOpen', 'songSearch', 'clearSongSearch', 'lyricsToggle', 'lyricsPanel', 'lyricsClose', 'openBottle', 'allStars']) {
    assert.match(html, new RegExp(`id="${id}"`), `${id} control should exist`);
  }
  assert.match(html, /<script src="assets\/lyrics\/lyrics-data\.js"><\/script>/);
});
