// State management
const state = {
  songs: [],
  currentIndex: -1,
  isPlaying: false,
  searchQuery: '',
  lyrics: []
};

// DOM Elements
const elements = {
  songList: document.getElementById('songList'),
  songCount: document.getElementById('songCount'),
  songSearch: document.getElementById('songSearch'),
  currentTitle: document.getElementById('currentTitle'),
  currentStatus: document.getElementById('currentStatus'),
  playBtn: document.getElementById('playBtn'),
  audio: document.getElementById('audioPlayer'),
  progressBar: document.getElementById('progressBar'),
  currentTime: document.getElementById('currentTime'),
  duration: document.getElementById('duration'),
  lyricsList: document.getElementById('lyricsList')
};

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

async function loadSongs() {
  try {
    const response = await fetch('songs.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('songs.json is not an array');
    state.songs = data;
    elements.currentStatus.textContent = `${state.songs.length} songs loaded`;
    renderSongList();
    if (state.songs.length > 0) selectSong(0);
  } catch (error) {
    console.error('Error loading songs:', error);
    elements.currentStatus.textContent = `Error: ${error.message}`;
    elements.currentTitle.textContent = 'Failed to load songs';
  }
}

function renderSongList() {
  const query = state.searchQuery.toLowerCase();
  const filtered = state.songs.filter(song =>
    (song.title && song.title.toLowerCase().includes(query)) ||
    (song.id && song.id.toLowerCase().includes(query))
  );

  const displaySongs = query === '' ? state.songs : filtered;

  elements.songList.innerHTML = '';
  elements.songCount.textContent = String(displaySongs.length);

  displaySongs.forEach((song) => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'song-btn';
    btn.textContent = `${song.id || '000'} - ${song.title}`;
    btn.dataset.index = String(state.songs.indexOf(song));
    btn.addEventListener('click', () => selectSong(state.songs.indexOf(song)));

    if (state.currentIndex === state.songs.indexOf(song)) {
      btn.classList.add('active');
    }

    li.appendChild(btn);
    elements.songList.appendChild(li);
  });
}

async function selectSong(index) {
  if (index < 0 || index >= state.songs.length) return;

  const song = state.songs[index];
  state.currentIndex = index;

  elements.currentTitle.textContent = song.title || 'Unknown Song';
  elements.currentStatus.textContent = 'Loading...';
  elements.audio.pause();
  elements.audio.src = song.audio || '';
  elements.audio.load();

  elements.progressBar.value = 0;
  elements.currentTime.textContent = '0:00';
  elements.duration.textContent = '0:00';
  elements.playBtn.textContent = '▶ PLAY';

  if (song.lyrics) {
    await loadLyrics(song.lyrics);
  } else {
    elements.lyricsList.innerHTML = '<p class="no-lyrics">No lyrics available</p>';
    state.lyrics = [];
  }

  renderSongList();
  elements.currentStatus.textContent = 'Ready - Click PLAY';
}

async function loadLyrics(lyricsUrl) {
  try {
    const response = await fetch(lyricsUrl, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error('Lyrics not found');
    }
    const text = await response.text();
    state.lyrics = parseLrc(text);
    renderLyrics(state.lyrics);
  } catch (error) {
    console.warn('Could not load lyrics:', error);
    state.lyrics = [];
    elements.lyricsList.innerHTML = '<p class="no-lyrics">No lyrics available</p>';
  }
}

function parseLrc(text) {
  if (!text) return [];
  const lines = text.split(/\r?\n/);
  const lyrics = [];

  lines.forEach((line) => {
    const match = line.match(/\[(\d+):(\d+(?:\.\d+)?)\](.*)/);
    if (!match) return;

    const minutes = parseInt(match[1], 10);
    const seconds = parseFloat(match[2]);
    const lyricText = match[3].trim();

    if (lyricText) {
      lyrics.push({ time: minutes * 60 + seconds, text: lyricText });
    }
  });

  return lyrics.sort((a, b) => a.time - b.time);
}

function renderLyrics(lyrics) {
  elements.lyricsList.innerHTML = '';

  if (lyrics.length === 0) {
    elements.lyricsList.innerHTML = '<p class="no-lyrics">No lyrics available</p>';
    return;
  }

  lyrics.forEach((lyric, index) => {
    const line = document.createElement('div');
    line.className = 'lyric-line';
    line.dataset.index = String(index);
    line.dataset.time = String(lyric.time);
    line.textContent = lyric.text;
    elements.lyricsList.appendChild(line);
  });
}

function updateLyricsHighlight() {
  const lines = document.querySelectorAll('.lyric-line');
  if (!lines.length) return;

  const currentTime = elements.audio.currentTime;
  lines.forEach((line, index) => {
    const lineTime = parseFloat(line.dataset.time);
    const nextTime = index < lines.length - 1 ? parseFloat(lines[index + 1].dataset.time) : Infinity;
    const active = currentTime >= lineTime && currentTime < nextTime;
    line.classList.toggle('active', active);
    if (active) line.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}

function togglePlay() {
  if (!elements.audio.src) {
    elements.currentStatus.textContent = 'Please select a song';
    return;
  }

  if (elements.audio.paused) {
    elements.audio.play().then(() => {
      elements.playBtn.textContent = '❚❚ PAUSE';
      elements.currentStatus.textContent = 'Playing...';
    }).catch((err) => {
      console.error('Play error:', err);
      elements.currentStatus.textContent = 'Audio playback blocked';
    });
  } else {
    elements.audio.pause();
    elements.playBtn.textContent = '▶ PLAY';
    elements.currentStatus.textContent = 'Paused';
  }
}

function updateProgress() {
  const duration = elements.audio.duration || 0;
  const current = elements.audio.currentTime || 0;

  if (duration > 0) {
    elements.progressBar.max = 100;
    elements.progressBar.value = (current / duration) * 100;
  }

  elements.currentTime.textContent = formatTime(current);
  elements.duration.textContent = formatTime(duration);
  updateLyricsHighlight();
}

function seek(event) {
  if (!elements.audio.duration) return;
  const percent = Number(event.target.value) / 100;
  elements.audio.currentTime = elements.audio.duration * percent;
}

// Event listeners
elements.songSearch.addEventListener('input', (e) => {
  state.searchQuery = e.target.value.trim().toLowerCase();
  renderSongList();
});

elements.playBtn.addEventListener('click', togglePlay);
elements.progressBar.addEventListener('input', seek);
elements.audio.addEventListener('timeupdate', updateProgress);
elements.audio.addEventListener('ended', () => {
  elements.playBtn.textContent = '▶ PLAY';
  elements.currentStatus.textContent = 'Finished';
});
elements.audio.addEventListener('error', (e) => {
  console.error('Audio error', e);
  elements.currentStatus.textContent = 'Audio could not be loaded';
});

loadSongs();
