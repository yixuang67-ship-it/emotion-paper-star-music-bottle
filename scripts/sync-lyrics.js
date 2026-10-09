// 从 script.js 的 musicList 读取本地歌词文件，为 file:// 直接打开页面生成回退副本。
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const script = fs.readFileSync(path.join(root, 'script.js'), 'utf8');
const tracks = [...script.matchAll(/\{ id: "([^"]+)", title: "[^"]+", artist: "[^"]+", album: "[^"]*", duration: \d+, src: "[^"]+", cover: "[^"]+", lyrics: "([^"]+)" \}/g)];
const lyrics = Object.fromEntries(tracks.map(([, id, relativePath]) => {
  const fullPath = path.join(root, relativePath);
  return [id, fs.existsSync(fullPath) ? fs.readFileSync(fullPath, 'utf8') : ''];
}));

fs.writeFileSync(path.join(root, 'assets/lyrics/lyrics-data.js'), `window.LOCAL_LYRICS = ${JSON.stringify(lyrics)};\n`, 'utf8');
console.log(`已同步 ${Object.keys(lyrics).length} 首歌曲的本地歌词。`);
