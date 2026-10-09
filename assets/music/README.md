# 本地歌曲

播放器只读取此目录中的本地音频。当前三首歌已经接入：

- `bigbang-voice.mp3`
- `nine-percent-good-things.mp3`
- `clazziquai-she-is.mp3`

添加或替换音频时，把文件放在这里，然后在项目根目录的 `script.js` 中修改 `musicList` 对应曲目的 `src`。`duration` 可以设为 `0`，播放器会在浏览器读取音频元数据后更新总时长。
