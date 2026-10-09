const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const script = fs.readFileSync(path.join(root, 'script.js'), 'utf8');

test('the existing page loads its dedicated UI stylesheet without dropping interaction hooks', () => {
  const stylesheetLink = /<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']\.\/style\.css["']/i;
  assert.ok(stylesheetLink.test(html), 'index.html must load ./style.css');
  assert.ok(fs.existsSync(path.join(root, 'style.css')), 'the UI stylesheet must exist');
  const styles = fs.readFileSync(path.join(root, 'style.css'), 'utf8');

  const hookedIds = [...script.matchAll(/\$\(["']#([\w-]+)["']\)/g)].map((match) => match[1]);
  for (const id of hookedIds) assert.match(html, new RegExp(`\\bid=["']${id}["']`), `missing existing interaction hook #${id}`);

  for (const selector of ['.layout', '.main-stage', '.carousel', '.carousel-disc', '#currentCover', '.bottle-card', '.overlay', '.modal']) {
    assert.ok(styles.includes(selector), `style.css must style ${selector}`);
  }
});

test('responsive visual contract covers a square paused CD, playback motion and narrow screens', () => {
  assert.ok(fs.existsSync(path.join(root, 'style.css')), 'the UI stylesheet must exist');
  const styles = fs.readFileSync(path.join(root, 'style.css'), 'utf8');

  assert.match(styles, /\.carousel-disc\s*\{[^}]*aspect-ratio\s*:\s*1\s*\/\s*1[^}]*border-radius\s*:\s*50%/s);
  assert.match(styles, /#currentCover\s*\{[^}]*width\s*:\s*88%[^}]*height\s*:\s*88%/s);
  assert.match(styles, /#stage\.is-playing\s+\.carousel-disc\s*\{[^}]*animation-play-state\s*:\s*running/s);
  assert.match(styles, /animation\s*:\s*cd-spin[^;]*paused/);
  assert.match(styles, /@media\s*\(max-width\s*:\s*767px\)/);
  assert.match(styles, /@media\s*\(min-width\s*:\s*1200px\)/);
  assert.match(styles, /prefers-reduced-motion\s*:\s*reduce/);
  assert.match(styles, /overflow-x\s*:\s*hidden/);
});
