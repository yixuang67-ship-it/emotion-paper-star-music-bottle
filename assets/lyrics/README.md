# 本地歌词

当前两首歌的 LRC 已接入此目录。带标准时间戳的 LRC 会随播放和拖动进度高亮；TXT 会按原文显示，不做同步高亮。

添加或替换歌词时，把 `.lrc` 或 `.txt` 放在这里，并在项目根目录 `script.js` 的 `musicList` 中更新该歌曲的 `lyrics` 相对路径。为了支持直接双击 `index.html` 的 `file://` 用法，再运行：

```sh
node scripts/sync-lyrics.js
```

此命令会从 `musicList` 指向的歌词文件重新生成 `assets/lyrics/lyrics-data.js`；网页在本地 HTTP 服务下也会优先读取对应的歌词文件。
