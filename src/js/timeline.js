import { projectState, getActiveTimeline, SECONDS_PER_PIXEL } from './state.js';
import { formatTime } from './utils.js';

// --- Context menu for adding tracks ---
export function setupTrackPanelContextMenu(updateTimeline) {
  let menu = document.getElementById('track-panel-context-menu');
  if (menu) menu.remove();

  menu = document.createElement('ul');
  menu.id = 'track-panel-context-menu';
  menu.className = 'context-menu';
  menu.innerHTML = `
    <li id="add-video-track-menu">Add Video Track</li>
    <li id="add-audio-track-menu">Add Audio Track</li>
    <li id="add-video-audio-track-menu">Add Video + Audio Linked Tracks</li>
  `;
  document.body.appendChild(menu);

  menu.querySelector('#add-video-track-menu').onclick = function() {
    addTrack('video');
    updateTimeline();
    menu.style.display = "none";
  };
  menu.querySelector('#add-audio-track-menu').onclick = function() {
    addTrack('audio');
    updateTimeline();
    menu.style.display = "none";
  };
  menu.querySelector('#add-video-audio-track-menu').onclick = function() {
    addTrack('video');
    addTrack('audio');
    updateTimeline();
    menu.style.display = "none";
  };

  // Context menu handler (fires on empty area of track timeline)
  const tracksCol = document.getElementById('timeline-tracks-col');
  tracksCol.addEventListener('contextmenu', function(e) {
    // Only trigger if right-click target is the tracks container or empty spot (not a clip!)
    if (
      e.target === tracksCol ||
      e.target.classList.contains('timeline-track-row') ||
      e.target.classList.contains('timeline-track-items')
    ) {
      e.preventDefault();
      menu.style.display = "block";
      menu.style.left = `${e.pageX}px`;
      menu.style.top = `${e.pageY}px`;
    }
  });
  // Hide on click elsewhere
  document.body.addEventListener('click', () => { menu.style.display = "none"; });
}

function addTrack(type) {
  const t = getActiveTimeline();
  if (!t) return;
  let id = `track-${Date.now()}-${type.charAt(0)}`;
  t.tracks.push({ id, type, enabled: true, items: [] });
}

export function updateTimelineMeta() {
  const t = getActiveTimeline();
  if (t) {
    document.getElementById('timeline-meta').textContent =
      `${t.name} | ${t.codec} | ${t.fps} FPS | ${t.width}x${t.height}`;
  }
}
export function updateTimelineList(updateTimelineSettings, updateTimeline, updateTimelineMeta) {
  const list = document.getElementById('timeline-list');
  list.innerHTML = '';
  projectState.timelines.forEach(t => {
    const li = document.createElement('li');
    li.textContent = t.name;
    li.className = t.id === projectState.activeTimelineId ? 'selected' : '';
    li.onclick = () => {
      projectState.activeTimelineId = t.id;
      updateTimelineList(updateTimelineSettings, updateTimeline, updateTimelineMeta);
      updateTimelineSettings();
      updateTimeline();
      updateTimelineMeta();
    };
    list.appendChild(li);
  });
}
export function updateTimelineSettings() {
  const t = getActiveTimeline();
  const d = document.getElementById('timeline-settings');
  if (!t) { d.textContent = ''; return; }
  d.textContent = `Codec: ${t.codec} | FPS: ${t.fps} | Res: ${t.width}x${t.height}`;
}
export function updateTimeline() {
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
    const ctrlRow = document.createElement('div');
    ctrlRow.className = 'track-controls-row';
    ctrlRow.innerHTML = `
      <span class="track-label">${track.type.toUpperCase()} ${trackIdx+1}</span>
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

    const trackRow = document.createElement('div');
    trackRow.className = 'timeline-track-row';
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

      // Resize handles
      const leftHandle = document.createElement('div');
      leftHandle.className = 'resize-handle left';
      block.appendChild(leftHandle);
      const rightHandle = document.createElement('div');
      rightHandle.className = 'resize-handle right';
      block.appendChild(rightHandle);

      block.innerHTML += `
        <img src="${clip.thumbnail}" class="timeline-clip-thumbnail">
        <div class="timeline-clip-label">${clip.name}</div>
        <div class="timeline-clip-time">${formatTime(clip.start)} – ${formatTime(clip.start + clip.duration)}</div>
        <button class="remove-clip-btn" title="Remove">&times;</button>`;
      block.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-clip-btn')) return;
        // Optionally handle preview of this clip
        e.stopPropagation();
      });
      block.querySelector('.remove-clip-btn').onclick = (e) => {
        track.items.splice(itemIdx, 1);
        updateTimeline();
        e.stopPropagation();
      };
      items.appendChild(block);
    });

    // Drag/drop support
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
}

// Helper for media.js
export function addMediaToTrack(media, trackId) {
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
  if (media.type === 'audio' || media.type === 'video') {
    duration = 5;
  }
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
  updateTimeline();
}