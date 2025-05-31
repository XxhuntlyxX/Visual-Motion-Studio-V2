// ...other code and data structures unchanged...

let pixiApp;
let selectedFiles = [];
let projectState = {
  media: [],
  timelines: [],
  activeTimelineId: null
};
const SECONDS_PER_PIXEL = 0.2;

// --- TRACK CONTEXT MENU ---
const trackPanelContextMenu = document.getElementById('track-panel-context-menu');
trackPanelContextMenu.innerHTML = `
  <li id="add-video-track-menu">Add Video Track</li>
  <li id="add-audio-track-menu">Add Audio Track</li>
  <li id="add-video-audio-track-menu">Add Video + Audio Linked Tracks</li>
`;
// Helper to find which track row was right-clicked
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

// ...rest of your main.js (unchanged until updateTimeline)...

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
      ${track.type === 'audio' ? `
        <button onclick="toggleMute('${track.id}')">${track.mute ? 'Unmute' : 'Mute'}</button>
        <button onclick="toggleSolo('${track.id}')">${track.solo ? 'Unsolo' : 'Solo'}</button>
      ` : ''}
      ${track.type === 'video' ? `
        <button onclick="toggleTrack('${track.id}')">${track.enabled === false ? 'Enable' : 'Disable'}</button>
      ` : ''}
      <button onclick="removeTrack('${track.id}')">Remove</button>
    `;
    controlsCol.appendChild(ctrlRow);

    // Timeline tracks column
    const trackRow = document.createElement('div');
    trackRow.className = 'timeline-track-row';
    if (track.linkedGroup) trackRow.classList.add('linked');
    const items = document.createElement('div');
    items.className = 'timeline-track-items';
    items.id = `track-items-${track.id}`;
    items.setAttribute('data-track-id', track.id);
    track.items.forEach((clip, itemIdx) => {
      const width = clip.duration / SECONDS_PER_PIXEL;
      const block = document.createElement('div');
      block.className = `timeline-clip ${track.type}`;
      block.style.width = width + 'px';
      block.style.left = (clip.start / SECONDS_PER_PIXEL) + 'px';
      block.setAttribute('data-clip-idx', itemIdx);
      block.setAttribute('data-track-id', track.id);
      const leftHandle = document.createElement('div');
      leftHandle.className = 'resize-handle left';
      leftHandle.onmousedown = e => startResizeClip(e, track, clip, 'left');
      block.appendChild(leftHandle);
      const rightHandle = document.createElement('div');
      rightHandle.className = 'resize-handle right';
      rightHandle.onmousedown = e => startResizeClip(e, track, clip, 'right');
      block.appendChild(rightHandle);
      block.innerHTML += `
        <img src="${clip.thumbnail}" class="timeline-clip-thumbnail">
        <div class="timeline-clip-label">${clip.name}</div>
        <div class="timeline-clip-time">${formatTime(clip.start)} – ${formatTime(clip.start + clip.duration)}</div>
        <button class="remove-clip-btn" title="Remove">&times;</button>`;
      block.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-clip-btn')) return;
        showPreviewForClip(clip);
        e.stopPropagation();
      });
      block.querySelector('.remove-clip-btn').onclick = (e) => {
        track.items.splice(itemIdx, 1);
        updateTimeline();
        e.stopPropagation();
      };
      items.appendChild(block);
    });
    items.ondragover = e => { e.preventDefault(); items.style.background="#205e99"; };
    items.ondragleave = e => { items.style.background=""; };
    items.ondrop = e => {
      e.preventDefault();
      items.style.background="";
      const mediaId = e.dataTransfer.getData('media-id');
      const media = projectState.media.find(m => m.id === mediaId);
      if (media) addMediaToTrack(media, track.id);
    };

    trackRow.appendChild(items);
    tracksCol.appendChild(trackRow);
  });

  // Playhead position
  const playheadPx = (window.playhead || 0) / SECONDS_PER_PIXEL;
  playheadDiv.style.left = playheadPx + 'px';
  playheadDiv.style.height = tracksCol.offsetHeight + 'px';
  tracksCol.scrollLeft = Math.max(0, playheadPx - 100);
  updatePlayhead();
}

// --- Linked Media Addition for Linked Video+Audio Tracks ---
function addMediaToTrack(media, trackId) {
  const t = getActiveTimeline();
  if (!t) return;
  const track = t.tracks.find(tr => tr.id === trackId);
  if (!track) return;
  let nextStart = 0;
  if (track.items.length > 0) {
    const last = track.items[track.items.length-1];
    nextStart = last.start + last.duration;
  }
  let duration = 5;
  if (media.type === 'audio' || media.type === 'video') duration = 5;
  if (media.type === 'video' && track.linkedGroup && track.linkedRole === 'video') {
    // add video part to this track
    track.items.push({
      id: 'clip-'+Date.now()+Math.random(),
      mediaId: media.id,
      type: 'video',
      name: media.name,
      src: media.dataUrl,
      start: nextStart,
      duration: duration,
      thumbnail: media.thumbnail
    });
    // find linked audio track (immediately above)
    const groupIdx = t.tracks.indexOf(track);
    if (groupIdx > 0 && t.tracks[groupIdx-1].linkedGroup === track.linkedGroup && t.tracks[groupIdx-1].linkedRole === 'audio') {
      t.tracks[groupIdx-1].items.push({
        id: 'clip-'+Date.now()+Math.random(),
        mediaId: media.id,
        type: 'audio',
        name: media.name + " (audio)",
        src: media.dataUrl, // in real app, use actual audio only
        start: nextStart,
        duration: duration,
        thumbnail: '' // set a generic audio icon if needed
      });
    }
  } else {
    track.items.push({
      id: 'clip-'+Date.now()+Math.random(),
      mediaId: media.id,
      type: media.type,
      name: media.name,
      src: media.dataUrl,
      start: nextStart,
      duration: duration,
      thumbnail: media.thumbnail
    });
  }
  updateTimeline();
}

// ...rest of your code (unchanged)...