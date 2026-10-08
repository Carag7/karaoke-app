// State management
const state = {
  songs: [],
  currentIndex: -1,
  isPlaying: false,
  searchQuery: ''
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

// Format time
function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

// Load songs from JSON
async function loadSongs() {
  try {
    const response = await fetch('songs.json');
    const data = await response.json();
    state.songs = data;
    console.log(`Loaded ${state.songs.length} songs`);
    renderSongList();
  } catch (error) {
    console.error('Error loading songs:', error);
    elements.currentStatus.textContent = 'Error loading songs';
  }
}

// Render song list
function renderSongList() {
  const query = state.searchQuery.toLowerCase();
  const filtered = state.songs.filter(song => 
    song.title.toLowerCase().includes(query) || 
    (song.id && song.id.includes(query))
  );

  elements.songList.innerHTML = '';
  elements.songCount.textContent = filtered.length;

  filtered.forEach((song, index) => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.className = 'song-btn';
    btn.textContent = `${song.id || ''} - ${song.title}`;
    btn.onclick = () => selectSong(state.songs.indexOf(song));
    li.appendChild(btn);
    elements.songList.appendChild(li);
  });
}

// Select song
function selectSong(index) {
  if (index < 0 || index >= state.songs.length) return;
  
  state.currentIndex = index;
  const song = state.songs[index];
  
  console.log('Selected song:', song);
  
  elements.currentTitle.textContent = song.title;
  elements.currentStatus.textContent = 'Loaded - Ready to play';
  
  // Stop current playback
  elements.audio.pause();
  
  // Set audio source
  elements.audio.src = song.audio;
  elements.audio.load();
  
  // Reset progress
  elements.progressBar.value = 0;
  elements.currentTime.textContent = '0:00';
  elements.duration.textContent = '0:00';
  
  // Load lyrics if available
  if (song.lyrics) {
    loadLyrics(song.lyrics);
  } else {
    elements.lyricsList.innerHTML = '<p>No lyrics available</p>';
  }
  
  // Highlight selected song
  document.querySelectorAll('.song-btn').forEach((btn, i) => {
    btn.classList.toggle('active', i === state.songs.indexOf(song));
  });
}

// Load lyrics
async function loadLyrics(lyricsUrl) {
  try {
    const response = await fetch(lyricsUrl);
    const text = await response.text();
    const lyrics = parseLrc(text);
    renderLyrics(lyrics);
  } catch (error) {
    console.error('Error loading lyrics:', error);
    elements.lyricsList.innerHTML = '<p>Could not load lyrics</p>';
  }
}

// Parse LRC format
function parseLrc(text) {
  const lines = text.split('\n');
  const lyrics = [];
  
  lines.forEach(line => {
    const match = line.match(/\[(\d+):(\d+(?:\.\d+)?)\](.*)/);
    if (match) {
      const minutes = parseInt(match[1]);
      const seconds = parseFloat(match[2]);
      const text = match[3].trim();
      
      if (text) {
        lyrics.push({
          time: minutes * 60 + seconds,
          text: text
        });
      }
    }
  });
  
  return lyrics.sort((a, b) => a.time - b.time);
}

// Render lyrics
function renderLyrics(lyrics) {
  if (lyrics.length === 0) {
    elements.lyricsList.innerHTML = '<p>No lyrics</p>';
    return;
  }
  
  elements.lyricsList.innerHTML = '';
  lyrics.forEach((lyric, index) => {
    const div = document.createElement('div');
    div.className = 'lyric-line';
    div.dataset.index = index;
    div.dataset.time = lyric.time;
    div.textContent = lyric.text;
    elements.lyricsList.appendChild(div);
  });
}

// Update lyrics highlighting
function updateLyricsHighlight() {
  const currentTime = elements.audio.currentTime;
  const lines = document.querySelectorAll('.lyric-line');
  
  lines.forEach(line => {
    const lineTime = parseFloat(line.dataset.time);
    line.classList.toggle('active', 
      currentTime >= lineTime && 
      currentTime < (parseFloat(lines[parseInt(line.dataset.index) + 1]?.dataset.time) || Infinity)
    );
  });
}

// Play/Pause
function togglePlay() {
  if (!elements.audio.src) return;
  
  if (elements.audio.paused) {
    elements.audio.play().catch(e => {
      console.error('Play error:', e);
      elements.currentStatus.textContent = 'Error: Cannot play audio';
    });
    elements.playBtn.textContent = '⏸ PAUSE';
  } else {
    elements.audio.pause();
    elements.playBtn.textContent = '▶ PLAY';
  }
}

// Update progress
function updateProgress() {
  const duration = elements.audio.duration || 0;
  const current = elements.audio.currentTime || 0;
  
  if (duration > 0) {
    elements.progressBar.max = duration;
    elements.progressBar.value = current;
  }
  
  elements.currentTime.textContent = formatTime(current);
  elements.duration.textContent = formatTime(duration);
  updateLyricsHighlight();
}

// Seek
function seek(e) {
  const time = (e.target.value / e.target.max) * elements.audio.duration;
  elements.audio.currentTime = time;
}

// Event listeners
elements.playBtn.addEventListener('click', togglePlay);
elements.songSearch.addEventListener('input', (e) => {
  state.searchQuery = e.target.value;
  renderSongList();
});
elements.progressBar.addEventListener('input', seek);
elements.audio.addEventListener('timeupdate', updateProgress);
elements.audio.addEventListener('ended', () => {
  elements.playBtn.textContent = '▶ PLAY';
});

// Initialize
loadSongs();