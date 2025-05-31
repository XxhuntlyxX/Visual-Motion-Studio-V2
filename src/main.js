// --- DATA MODEL ---
let selectedFiles = [];
let projectState = {
  media: [],
  timelines: [
    {
      id: 'timeline1',
      name: 'Timeline 1',
      tracks: [],
    }
  ],
  activeTimelineId: 'timeline1'
};
const SECONDS_PER_PIXEL = 0.2;

// --- MEDIA UPLOAD ---
document.getElementById('media-upload').addEventListener('change', e => {
  selectedFiles = Array.from(e.target.files);
  updatePendingUploads();
});
document.getElementById('upload-to-project-btn').addEventListener('click', () => {
  if (!selectedFiles.length) return;
  let loaded = 0;
  selectedFiles.forEach(file => {
    const type = getMediaType(file);
    generateThumbnail(file, type, thumb => {
      const reader = new FileReader();
      reader.onload = function(ev) {
        projectState.media.push({
          id: 'media-'+Date.now()+Math.random(),
          name: file.name,
          type,
          dataUrl: ev.target.result,
          thumbnail: thumb
        });
        loaded++;
        if (loaded === selectedFiles.length) {
          updateMediaList();
          selectedFiles = [];
          updatePendingUploads();
        }
      };
      reader.readAsDataURL(file);
    });
  });
});
function updatePendingUploads() {
  const d = document.getElementById('pending-uploads');
  if (!selectedFiles.length) {
    d.innerHTML = '';
    return;
  }
  d.innerHTML = `<strong>Pending Upload:</strong><ul>${
    selectedFiles.map(f=>`<li>${f.name}</li>`).join('')
  }</ul>`;
}
function getMediaType(file) {
  if (file.type) {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'audio';
  }
  const ext = file.name.split('.').pop().toLowerCase();
  if (['jpg','jpeg','png','gif','bmp','webp'].includes(ext)) return 'image';
  if (['mp4','mov','avi','webm'].includes(ext)) return 'video';
  if (['mp3','wav','ogg'].includes(ext)) return 'audio';
  return 'other';
}
function generateThumbnail(file, type, cb) {
  if (type === 'image') {
    const reader = new FileReader();
    reader.onload = (e) => cb(e.target.result);
    reader.readAsDataURL(file);
  } else if (type === 'video') {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.src = url;
    video.currentTime = 0.1;
    video.addEventListener('loadeddata', function () {
      const canvas = document.createElement('canvas');
      canvas.width = 80;
      canvas.height = 48;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, 80, 48);
      cb(canvas.toDataURL());
      URL.revokeObjectURL(url);
    }, {once: true});
    video.load();
  } else if (type === 'audio') {
    cb('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><rect width="48" height="48" fill="#3ba845"/><text x="24" y="32" text-anchor="middle" font-size="32" fill="#fff">🎵</text></svg>');
  }
}
function updateMediaList() {
  const list = document.getElementById('media-list');
  list.innerHTML = '';
  projectState.media.forEach(media => {
    const li = document.createElement('li');
    li.textContent = media.name;
    list.appendChild(li);
  });
}

// --- TRACK CONTEXT MENU ---
const trackPanelContextMenu = document.getElementById('track-panel-context-menu');
trackPanelContextMenu.innerHTML = `
  <li id="add-video-track-menu">Add Video Track</li>
  <li id="add-audio-track-menu">Add Audio Track</li>
  <li id="add-video-audio-track-menu">Add Video + Audio Linked Tracks</li>
`;
// Find the row index clicked
function getTrackIdxFromControlsRow(row) {
  const controlsCol = document.getElementById('track-controls-col');
  return Array.from(controlsCol.children).indexOf(row);
}
document.getElementById('track-controls-col').oncontextmenu = function(e) {
  e.preventDefault();
  let targetRow = e.target.closest('.track-controls-row');
  trackPanelContextMenu.style.display = 'block';
  trackPanelContextMenu.style.left = `${e.pageX}px`;
  trackPanelContextMenu.style.top = `${e.pageY}px`;
  trackPanelContextMenu.dataset.rowIdx = targetRow ? getTrackIdxFromControlsRow(targetRow) : '';
};
document.addEventListener('click', () => trackPanelContextMenu.style.display = 'none');
document.getElementById('add-video-track-menu').onclick = function() {
  trackPanelContextMenu.style.display = 'none';
  addTrackAtContext('video');
};
document.getElementById('add-audio-track-menu').onclick = function() {
  trackPanelContextMenu.style.display = 'none';
  addTrackAtContext('audio');
};
document.getElementById('add-video-audio-track-menu').onclick = function() {
  trackPanelContextMenu.style.display = 'none';
  addTrackAtContext('linked');
};
function addTrackAtContext(type) {
  const t = getActiveTimeline();
  if (!t) return;
  let insertIdx = trackPanelContextMenu.dataset.rowIdx === '' ? t.tracks.length : parseInt(trackPanelContextMenu.dataset.rowIdx, 10);
  if (type === 'video') {
    t.tracks.splice(insertIdx, 0, {id: 'track-'+Date.now()+'-v', type: 'video', enabled: true, items: []});
  } else if (type === 'audio') {
    t.tracks.splice(insertIdx, 0, {id: 'track-'+Date.now()+'-a', type: 'audio', enabled: true, items: []});
  } else if (type === 'linked') {
    const groupId = 'linked-'+Date.now()+Math.floor(Math.random()*1000);
    t.tracks.splice(insertIdx, 0, {
      id: 'track-'+Date.now()+'-a',
      type: 'audio',
      enabled: true,
      items: [],
      linkedGroup: groupId,
      linkedRole: 'audio'
    });
    t.tracks.splice(insertIdx+1, 0, {
      id: 'track-'+Date.now()+'-v',
      type: 'video',
      enabled: true,
      items: [],
      linkedGroup: groupId,
      linkedRole: 'video'
    });
  }
  updateTimeline();
}

// --- Timeline Rendering ---
function getActiveTimeline() {
  return projectState.timelines.find(t=>t.id===projectState.activeTimelineId);
}
function updateTimeline() {
  const t = getActiveTimeline();
  const controlsCol = document.getElementById('track-controls-col');
  const tracksCol = document.getElementById('timeline-tracks-col');
  if (!t) {
    controlsCol.innerHTML = '';
    tracksCol.innerHTML = '';
    return;
  }
  controlsCol.innerHTML = '';
  let playheadDiv = document.getElementById('timeline-playhead');
  if (!playheadDiv) {
    playheadDiv = document.createElement('div');
    playheadDiv.id = 'timeline-playhead';
    tracksCol.appendChild(playheadDiv);
  }
  Array.from(tracksCol.children).forEach(child => {
    if (child.id !== 'timeline-playhead') tracksCol.removeChild(child);
  });

  t.tracks.forEach((track, trackIdx) => {
    // Controls column
    const ctrlRow = document.createElement('div');
    ctrlRow.className = 'track-controls-row';
    if (track.linkedGroup) ctrlRow.classList.add('linked');
    ctrlRow.innerHTML = `
      <span class="track-label">${track.type.toUpperCase()} ${trackIdx+1}${track.linkedGroup && track.linkedRole==='video' ? ' 🎞️' : (track.linkedGroup && track.linkedRole==='audio' ? ' 🎵' : '')}</span>
    `;
    controlsCol.appendChild(ctrlRow);

    // Timeline tracks (just empty rows for demo)
    const trackRow = document.createElement('div');
    trackRow.className = 'timeline-track-row';
    if (track.linkedGroup) trackRow.classList.add('linked');
    const items = document.createElement('div');
    items.className = 'timeline-track-items';
    items.id = `track-items-${track.id}`;
    items.setAttribute('data-track-id', track.id);
    trackRow.appendChild(items);
    tracksCol.appendChild(trackRow);
  });

  // Playhead position
  const playheadPx = 0;
  playheadDiv.style.left = playheadPx + 'px';
  playheadDiv.style.height = tracksCol.offsetHeight + 'px';
}

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
  updateMediaList();
  updateTimeline();
  updatePendingUploads();
});