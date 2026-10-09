// 浏览器与 Node 测试共用的纯逻辑：LRC 解析、当前行定位和歌曲搜索。
(function exposeLyricsCore(root) {
  function parseLrc(source) {
    const lines = [];
    const offsetMatch = source.match(/^\[offset:([+-]?\d+)\]/im);
    const offset = offsetMatch ? Number(offsetMatch[1]) / 1000 : 0;
    for (const rawLine of source.split(/\r?\n/)) {
      const stamps = [...rawLine.matchAll(/\[(\d{1,3}):(\d{2})(?:\.(\d{1,3}))?\]/g)];
      if (!stamps.length) continue;
      const text = rawLine.replace(/\[\d{1,3}:\d{2}(?:\.\d{1,3})?\]/g, '').trim()
        .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
        .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)));
      if (!text) continue;
      for (const stamp of stamps) {
        const fraction = stamp[3] ? Number(`0.${stamp[3]}`) : 0;
        const time = Math.max(0, Number(stamp[1]) * 60 + Number(stamp[2]) + fraction + offset);
        lines.push({ time, text });
      }
    }
    return lines.sort((a, b) => a.time - b.time);
  }

  function currentLyricIndex(lines, seconds) {
    let active = -1;
    for (let index = 0; index < lines.length; index += 1) {
      if (lines[index].time > seconds) break;
      active = index;
    }
    return active;
  }

  function filterSongs(songs, query) {
    const needle = String(query || '').trim().toLocaleLowerCase();
    if (!needle) return songs.slice();
    return songs.filter((song) => `${song.title || ''} ${song.artist || ''}`.toLocaleLowerCase().includes(needle));
  }

  const api = { parseLrc, currentLyricIndex, filterSongs };
  root.LyricsCore = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
