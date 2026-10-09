// 情绪纸星音乐瓶 Demo：本地音乐、歌词查看、纸星星与音乐瓶本地保存。

// 歌曲资源统一在这里维护；所有路径均指向项目内的本地文件。
const musicList = [
  { id: "bigbang-voice", title: "声をきかせて (让我听你的声音)", artist: "BIGBANG", album: "BIGBANG 2", duration: 0, src: "assets/music/bigbang-voice.mp3", cover: "assets/covers/bigbang.png", lyrics: "assets/lyrics/bigbang-voice.lrc" },
  { id: "clazziquai-she-is", title: "She Is", artist: "酷懒之味Clazziquai", album: "내 이름은 김삼순 (我的名字叫金三顺)", duration: 0, src: "assets/music/clazziquai-she-is.mp3", cover: "assets/covers/clazziquai-she-is.jpg", lyrics: "assets/lyrics/clazziquai-she-is.lrc" }
];

// 统一的情绪颜色表。neutral 可以和其他颜色一起选择，表示复杂混合情绪。
const emotionColors = {
  melancholy: { name: "忧郁", color: "#7EA6D8" },
  depression: { name: "抑郁", color: "#303030" },
  anger: { name: "愤怒", color: "#D96A6A" },
  happiness: { name: "幸福甜蜜", color: "#EFA4B8" },
  relaxation: { name: "轻松", color: "#91B89A" },
  anxiety: { name: "焦虑", color: "#E7A15C" },
  regret: { name: "懊悔", color: "#9B86C7" },
  joy: { name: "开心", color: "#E8C85A" },
  neutral: { name: "没有任何情绪", color: "#F4F1E8" }
};

const emotionEntries = Object.entries(emotionColors);
const $ = (selector) => document.querySelector(selector);
const audio = $("#audio");
const overlays = [...document.querySelectorAll(".overlay")];
const STORAGE_KEY = "paperStars";
let currentSong = musicList[0];
let songIndex = 0;
let isPlaying = false;
let simulatedTime = 0;
let lyricLines = [];
let lyricMode = "empty";
let activeLyricIndex = -2;
let lyricRequestId = 0;
let selectedColors = [];
let photoData = "";
let sortMode = "song";
let newestFirst = true;
let toastTimer;
let simulationTimer;
let starUid = 0;

function formatTime(seconds) {
  const value = Math.max(0, Math.floor(Number(seconds) || 0));
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

function readStars() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(value)) return [];
    // 兼容旧版字段，刷新后可以继续查看已保存的星星。
    return value.map((star) => ({
      ...star,
      songTitle: star.songTitle || star.songName || "未知歌曲",
      musicTime: Number(star.musicTime ?? star.time ?? 0),
      colors: Array.isArray(star.colors) ? star.colors : [],
      emotions: Array.isArray(star.emotions) ? star.emotions : []
    }));
  } catch (error) {
    console.warn("读取本地星星失败", error);
    return [];
  }
}

// 星星与照片都保存在浏览器本地，不会上传到服务器。
function saveStars(stars) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stars));
}

function colorNames(colors) {
  return colors.map((color) => emotionEntries.find(([, item]) => item.color === color)?.[1].name || "情绪");
}

function safeColors(colors) {
  return colors.length ? colors : [emotionColors.neutral.color];
}

// 手绘折纸星星：多色渐变、铅笔轮廓和折痕线组合，避免用纯色字形代替。
function starArt(colors, className = "paper-star") {
  const palette = safeColors(colors);
  const gradientId = `star-gradient-${++starUid}`;
  const step = 100 / palette.length;
  const stops = palette.map((color, index) => {
    const start = index * step;
    const end = (index + 1) * step;
    return `<stop offset="${start}%" stop-color="${color}"/><stop offset="${end}%" stop-color="${color}"/>`;
  }).join("");
  return `<svg class="${className}" viewBox="0 0 100 100" role="img" aria-label="${colorNames(palette).join("、")}混合纸星星" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="${gradientId}" x1="0" y1="0" x2="1" y2="1">${stops}</linearGradient></defs>
    <path d="M50 5 L61 36 L95 38 L69 59 L78 94 L50 75 L22 94 L31 59 L5 38 L39 36 Z" fill="url(#${gradientId})" stroke="#927a5e" stroke-width="2.2" stroke-linejoin="round"/>
    <path d="M50 5 L50 49 L39 36 M95 38 L50 49 L69 59 M78 94 L50 49 L50 75 M22 94 L50 49 L31 59 M5 38 L50 49 L61 36" fill="none" stroke="#fff9eb" stroke-width="1.7" stroke-linecap="round" opacity=".72"/>
    <path d="M50 7 L60 38 L92 39 M8 39 L39 38 L49 8 M24 90 L48 73 M76 90 L52 73" fill="none" stroke="#775f49" stroke-width=".8" stroke-linecap="round" opacity=".32"/>
  </svg>`;
}

function showOverlay(id) {
  overlays.forEach((overlay) => overlay.classList.remove("open"));
  $(`#${id}`)?.classList.add("open");
  $(`#${id} [data-close]`)?.focus();
}

function closeOverlays() {
  overlays.forEach((overlay) => overlay.classList.remove("open"));
}

document.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", closeOverlays));
overlays.forEach((overlay) => overlay.addEventListener("click", (event) => {
  if (event.target === overlay) closeOverlays();
}));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeOverlays();
});

function toast(message) {
  $("#toast").textContent = message;
  $("#toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("#toast").classList.remove("show"), 2600);
}

function playbackTime() {
  return currentSong.src ? (audio.currentTime || 0) : simulatedTime;
}

function updatePlaybackUI() {
  const time = playbackTime();
  $("#currentTime").textContent = formatTime(time);
  $("#duration").textContent = formatTime(currentSong.duration);
  $("#seek").max = Math.max(1, currentSong.duration || 0);
  $("#seek").value = Math.min(time, currentSong.duration);
  updateLyrics(time);
}

function setPlaying(value) {
  isPlaying = value;
  $("#play").textContent = value ? "❚❚" : "▶";
  $("#play").setAttribute("aria-label", value ? "暂停" : "播放");
  $("#stage").classList.toggle("is-playing", value);
  document.body.classList.toggle("is-playing", value);
  clearInterval(simulationTimer);
  if (value && !currentSong.src) {
    simulationTimer = setInterval(() => {
      simulatedTime += 1;
      if (simulatedTime >= currentSong.duration) {
        simulatedTime = currentSong.duration;
        setPlaying(false);
      }
      updatePlaybackUI();
    }, 1000);
  }
}

// loadSong 负责切歌时更新播放器、官方封面、歌词、进度与当前歌曲星星筛选。
function loadSong(song) {
  if (!song) return;
  audio.pause();
  currentSong = song;
  songIndex = musicList.findIndex((item) => item.id === song.id);
  if (song.src) {
    audio.src = song.src;
    audio.load();
  } else {
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
  }
  simulatedTime = 0;
  setPlaying(false);
  $("#songName").textContent = song.title;
  $("#artist").textContent = song.artist;
  $("#artSongName").textContent = song.title;
  $("#artArtist").textContent = song.artist;
  const cover = $("#currentCover");
  const missingCover = !song.cover;
  cover.hidden = missingCover;
  $("#discPlaceholder").hidden = !missingCover;
  $("#coverPlaceholder").hidden = !missingCover;
  if (song.cover) {
    cover.src = song.cover;
    cover.alt = `${song.title} 官方封面`;
    $("#songPickerOpen").title = `当前歌曲：${song.title}；点击选择其他歌曲`;
    cover.onerror = () => {
      cover.hidden = true;
      $("#discPlaceholder").hidden = false;
      $("#coverPlaceholder").hidden = false;
    };
  } else {
    cover.removeAttribute("src");
  }
  renderTrackList($("#songSearch").value);
  updatePlaybackUI();
  updateJar();
  loadLyrics(song);
}

audio.addEventListener("play", () => setPlaying(true));
audio.addEventListener("pause", () => { if (currentSong.src) setPlaying(false); });
audio.addEventListener("timeupdate", () => { if (currentSong.src) updatePlaybackUI(); });
audio.addEventListener("loadedmetadata", () => {
  if (currentSong.src && Number.isFinite(audio.duration)) {
    currentSong.duration = audio.duration;
    updatePlaybackUI();
  }
});
audio.addEventListener("ended", () => setPlaying(false));
audio.addEventListener("error", () => {
  if (currentSong.src) toast("这首本地音频暂时无法播放，请检查文件路径或格式。");
});

$("#play").addEventListener("click", () => {
  if (currentSong.src) {
    if (audio.paused) audio.play().catch(() => toast("浏览器无法播放此音频，请检查文件格式。"));
    else audio.pause();
    return;
  }
  setPlaying(!isPlaying);
});
$("#seek").addEventListener("input", (event) => {
  const time = Number(event.target.value);
  if (currentSong.src) audio.currentTime = time;
  else simulatedTime = time;
  updatePlaybackUI();
});
$("#volume").addEventListener("input", (event) => { audio.volume = Number(event.target.value); });

function switchSong(direction) {
  songIndex = (songIndex + direction + musicList.length) % musicList.length;
  loadSong(musicList[songIndex]);
  toast(`现在是《${currentSong.title}》`);
}
$("#prev").addEventListener("click", () => switchSong(-1));
$("#next").addEventListener("click", () => switchSong(1));
$("#favorite").addEventListener("click", (event) => {
  const button = event.currentTarget;
  const saved = button.getAttribute("aria-pressed") === "true";
  button.setAttribute("aria-pressed", String(!saved));
  button.textContent = saved ? "♡" : "♥";
  toast(saved ? "已取消收藏" : "已收藏这首歌");
});

function renderEmotions() {
  $("#emotionGrid").innerHTML = emotionEntries.map(([id, item]) => `
    <button class="emotion ${selectedColors.includes(id) ? "selected" : ""}" data-emotion="${id}" aria-pressed="${selectedColors.includes(id)}">
      <span class="star">${starArt([item.color], "emotion-star")}</span>
      <span class="emotion-name">${item.name}</span>
      <span class="check">${selectedColors.includes(id) ? "✓" : ""}</span>
    </button>`).join("");
  document.querySelectorAll("[data-emotion]").forEach((button) => button.addEventListener("click", () => {
    const id = button.dataset.emotion;
    selectedColors = selectedColors.includes(id)
      ? selectedColors.filter((value) => value !== id)
      : [...selectedColors, id];
    renderEmotions();
  }));
}

$("#addStar").addEventListener("click", () => {
  selectedColors = [];
  $("#message").value = "";
  $("#charCount").textContent = "0";
  clearPhoto();
  renderEmotions();
  showOverlay("emotionModal");
});

$("#toMessage").addEventListener("click", () => {
  if (!selectedColors.length) {
    toast("先选一种或几种此刻的心情吧 ✦");
    return;
  }
  const colors = selectedColors.map((id) => emotionColors[id].color);
  $("#foldStar").innerHTML = starArt(colors, "folded-star-art");
  showOverlay("messageModal");
});
$("#backEmotion").addEventListener("click", () => showOverlay("emotionModal"));
$("#message").addEventListener("input", () => { $("#charCount").textContent = $("#message").value.length; });

function clearPhoto() {
  photoData = "";
  $("#photo").value = "";
  $("#photoPreview").removeAttribute("src");
  $("#photoPreview").hidden = true;
  $("#photoName").textContent = "";
  $("#removePhoto").hidden = true;
}

$("#photo").addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
    toast("请上传 JPG、PNG 或 WEBP 图片。");
    clearPhoto();
    return;
  }
  if (file.size > 2 * 1024 * 1024) {
    toast("为确保照片可保存在浏览器，请选择 2MB 以内的图片。");
    clearPhoto();
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    photoData = String(reader.result || "");
    $("#photoPreview").src = photoData;
    $("#photoPreview").hidden = false;
    $("#photoName").textContent = file.name;
    $("#removePhoto").hidden = false;
  };
  reader.onerror = () => { toast("照片读取失败，请重新选择。 "); clearPhoto(); };
  reader.readAsDataURL(file);
});
$("#removePhoto").addEventListener("click", clearPhoto);

function createId() {
  return globalThis.crypto?.randomUUID?.() || `star-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

$("#dropStar").addEventListener("click", () => {
  const colors = selectedColors.map((id) => emotionColors[id].color);
  if (!colors.length) {
    toast("请返回选择星星颜色。");
    return;
  }
  const star = {
    id: createId(),
    message: $("#message").value.trim(),
    image: photoData,
    colors,
    emotions: colorNames(colors),
    songId: currentSong.id,
    songTitle: currentSong.title,
    artist: currentSong.artist,
    createdAt: new Date().toISOString(),
    musicTime: Math.floor(playbackTime())
  };
  try {
    const stars = readStars();
    stars.push(star);
    saveStars(stars);
  } catch (error) {
    console.error("保存星星失败", error);
    toast("浏览器本地空间不足。可以移除照片后再试。");
    return;
  }
  closeOverlays();
  updateJar();
  $("#flyingStar").innerHTML = starArt(colors, "flying-star-art");
  $("#flyingStar").setAttribute("aria-label", "星星正在飞进音乐瓶");
  const fly = $("#flyingStar");
  fly.style.animation = "none";
  void fly.offsetWidth;
  fly.style.animation = "fly 1.05s ease-in forwards";
  showOverlay("flyModal");
  setTimeout(() => {
    closeOverlays();
    toast("星星已经住进这首歌的音乐瓶啦 ✦");
  }, 1080);
});

function renderJar(container, stars) {
  const visible = stars.slice(-18);
  container.innerHTML = visible.map((star, index) => `
    <button class="jar-star-button" data-detail="${star.id}" aria-label="打开${star.emotions?.join("、") || "情绪"}星星详情" style="--float-delay:${index * -0.37}s;--float-time:${3.8 + (index % 4) * 0.55}s">
      ${starArt(star.colors)}
    </button>`).join("") || `${starArt(["#E8C85A"])}${starArt(["#7EA6D8"])}${starArt(["#EFA4B8"])}`;
  container.querySelectorAll("[data-detail]").forEach((button) => button.addEventListener("click", (event) => {
    event.stopPropagation();
    openDetail(button.dataset.detail);
  }));
}

function updateJar() {
  const stars = readStars().filter((star) => star.songId === currentSong.id);
  $("#bottleCount").textContent = `点击查看星星 · ${stars.length} 颗记忆`;
  renderJar($("#jarStars"), stars);
}

function openBottle() {
  const stars = readStars()
    .filter((star) => star.songId === currentSong.id)
    .sort((a, b) => a.musicTime - b.musicTime);
  $("#bottleSubtitle").textContent = `《${currentSong.title}》里，藏着 ${stars.length} 颗星星。`;
  $("#emptySong").hidden = stars.length > 0;
  const timeline = $("#timeline");
  timeline.innerHTML = stars.map((star, index) => {
    const percent = Math.max(3, Math.min(97, star.musicTime / Math.max(1, currentSong.duration) * 100));
    const stem = 28 + (index % 4) * 18;
    return `<button class="time-star" data-detail="${star.id}" style="--position:${percent}%;--stem:${stem}px" aria-label="${formatTime(star.musicTime)}，${star.emotions.join("、")}">
      ${starArt(star.colors)}<small>${formatTime(star.musicTime)}</small>
    </button>`;
  }).join("");
  renderJar($("#jarStarsBig"), stars);
  timeline.querySelectorAll("[data-detail]").forEach((button) => button.addEventListener("click", () => openDetail(button.dataset.detail)));
  showOverlay("bottleModal");
}
$("#openBottle").addEventListener("click", openBottle);
$("#openBottle").addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    openBottle();
  }
});

function openDetail(id) {
  const star = readStars().find((item) => item.id === id);
  if (!star) return;
  $("#detailEmotions").innerHTML = starArt(star.colors, "detail-star-art") + `<div class="detail-emotion-label">${star.emotions.map((name) => escapeHTML(name)).join(" + ")}</div>`;
  $("#detailTime").textContent = `投放于 ${new Date(star.createdAt).toLocaleDateString("zh-CN")} · 歌曲 ${formatTime(star.musicTime)}`;
  $("#detailMessage").textContent = star.message || "这一刻，没有留下文字。";
  const image = $("#detailImage");
  image.hidden = !star.image;
  if (star.image) image.src = star.image;
  else image.removeAttribute("src");
  $("#detailSong").textContent = `这颗星星属于：《${star.songTitle}》 · ${star.artist || ""}`;
  showOverlay("detailModal");
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

$("#allStars").addEventListener("click", openAllStars);
function openAllStars() {
  renderAllStars();
  showOverlay("allModal");
}

function renderAllStars() {
  const stars = readStars();
  if (sortMode === "song") stars.sort((a, b) => a.songTitle.localeCompare(b.songTitle, "zh-CN"));
  if (sortMode === "time") stars.sort((a, b) => (new Date(b.createdAt) - new Date(a.createdAt)) * (newestFirst ? 1 : -1));
  if (sortMode === "color") stars.sort((a, b) => {
    const aIndex = emotionEntries.findIndex(([, item]) => item.color === a.colors[0]);
    const bIndex = emotionEntries.findIndex(([, item]) => item.color === b.colors[0]);
    return aIndex - bIndex;
  });
  $("#allList").innerHTML = stars.map((star) => `
    <button class="star-row" data-detail="${star.id}" aria-label="打开《${escapeHTML(star.songTitle)}》星星详情">
      <span class="row-art">${starArt(star.colors, "row-star-art")}</span>
      <span class="row-copy"><span class="row-title">${escapeHTML(star.songTitle)} <span class="row-meta">· ${escapeHTML(star.artist || "")}</span></span>
      <span class="row-meta">${escapeHTML(star.emotions.join(" + "))}　${formatTime(star.musicTime)}　${escapeHTML(star.message.slice(0, 46))}</span></span><span aria-hidden="true">›</span>
    </button>`).join("") || '<p class="subtitle">还没有星星。去听一首歌，投下第一颗吧 ✦</p>';
  $("#allList").querySelectorAll("[data-detail]").forEach((button) => button.addEventListener("click", () => openDetail(button.dataset.detail)));
}

document.querySelectorAll("[data-sort]").forEach((button) => button.addEventListener("click", () => {
  if (button.dataset.sort === "time" && sortMode === "time") newestFirst = !newestFirst;
  sortMode = button.dataset.sort;
  if (sortMode === "time") button.textContent = `按时间：${newestFirst ? "最新" : "最早"}`;
  document.querySelectorAll("[data-sort]").forEach((item) => item.classList.toggle("active", item === button));
  renderAllStars();
}));

$("#detailModal").addEventListener("click", (event) => {
  if (event.target === $("#detailModal")) closeOverlays();
});

loadSong(currentSong);
updatePlaybackUI();
audio.volume = Number($("#volume").value);

function renderTrackList(query = "") {
  const results = LyricsCore.filterSongs(musicList, query);
  const list = $("#trackList");
  list.innerHTML = results.map((song) => `
    <button class="song-option" type="button" data-song="${escapeHTML(song.id)}" aria-pressed="${song.id === currentSong.id}">
      ${song.cover ? `<img src="${escapeHTML(song.cover)}" alt="${escapeHTML(song.title)} 官方封面" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span class="cover-missing" hidden>封面<br>暂缺</span>` : '<span class="cover-missing">封面<br>暂缺</span>'}
      <span class="song-option-copy"><strong>${escapeHTML(song.title)}</strong><small>${escapeHTML(song.artist)}${song.album ? ` · ${escapeHTML(song.album)}` : ""}</small></span>
      <span class="song-selected">${song.id === currentSong.id ? "正在播放" : "选择 ›"}</span>
    </button>`).join("");
  $("#trackEmpty").hidden = results.length > 0;
  list.querySelectorAll("[data-song]").forEach((button) => button.addEventListener("click", () => {
    const song = musicList.find((item) => item.id === button.dataset.song);
    if (!song) return;
    loadSong(song);
    closeOverlays();
  }));
}

function openSongPicker() {
  renderTrackList($("#songSearch").value);
  showOverlay("trackModal");
  $("#songSearch").focus();
}
$("#songPickerOpen").addEventListener("click", openSongPicker);
$("#discPickerOpen").addEventListener("click", openSongPicker);
$("#songSearch").addEventListener("input", (event) => renderTrackList(event.target.value));
$("#clearSongSearch").addEventListener("click", () => {
  $("#songSearch").value = "";
  renderTrackList("");
  $("#songSearch").focus();
});

async function loadLyrics(song) {
  const requestId = ++lyricRequestId;
  lyricLines = [];
  lyricMode = "empty";
  activeLyricIndex = -2;
  $("#lyricsTitle").textContent = `${song.title} · 歌词`;
  let text = window.LOCAL_LYRICS?.[song.id] || "";
  try {
    // 本地相对路径读取 LRC/TXT；file:// 模式使用随项目附带的歌词副本，避开浏览器的本地 fetch 限制。
    if (location.protocol !== "file:" && song.lyrics) {
      const response = await fetch(song.lyrics);
      if (response.ok) text = await response.text();
    }
  } catch (error) {
    console.info("使用项目内附带的歌词副本", error);
  }
  if (requestId !== lyricRequestId) return;
  if (!text.trim()) {
    lyricMode = "empty";
    renderLyrics();
    return;
  }
  lyricLines = LyricsCore.parseLrc(text);
  if (lyricLines.length) {
    lyricMode = "lrc";
  } else {
    lyricMode = "text";
    lyricLines = text.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !/^\[[a-z]+:/i.test(line));
  }
  renderLyrics();
}

function renderLyrics() {
  const content = $("#lyricsContent");
  content.replaceChildren();
  if (!lyricLines.length) {
    const empty = document.createElement("p");
    empty.className = "lyric-line";
    empty.textContent = "这首歌还没有歌词。";
    content.append(empty);
    return;
  }
  lyricLines.forEach((line, index) => {
    const row = document.createElement("div");
    row.className = "lyric-line";
    row.dataset.index = String(index);
    row.textContent = lyricMode === "lrc" ? line.text : line;
    content.append(row);
  });
  activeLyricIndex = -2;
  updateLyrics(playbackTime());
}

function updateLyrics(seconds) {
  if (lyricMode !== "lrc" || !lyricLines.length) return;
  const index = LyricsCore.currentLyricIndex(lyricLines, seconds);
  if (index === activeLyricIndex) return;
  activeLyricIndex = index;
  const content = $("#lyricsContent");
  content.querySelectorAll(".lyric-line").forEach((line, lineIndex) => line.classList.toggle("active", lineIndex === index));
  if (index >= 0 && !$("#lyricsPanel").hidden) {
    content.querySelector(`[data-index="${index}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }
}

$("#lyricsToggle").addEventListener("click", () => {
  const panel = $("#lyricsPanel");
  panel.hidden = !panel.hidden;
  $("#lyricsToggle").setAttribute("aria-expanded", String(!panel.hidden));
  if (!panel.hidden) {
    updateLyrics(playbackTime());
    $("#lyricsToggle").scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
});
$("#lyricsClose").addEventListener("click", () => {
  $("#lyricsPanel").hidden = true;
  $("#lyricsToggle").setAttribute("aria-expanded", "false");
});
