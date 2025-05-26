// --- DATA STRUCTURE ---
let pixiApp;
let selectedFiles = [];
let projectState = {
  media: [], // {id, name, type, dataUrl, thumbnail}
  timelines: [], // [{id, name, codec, fps, width, height, tracks}]
  activeTimelineId: null
};

const SECONDS_PER_PIXEL = 0.2;

// --- MENU & MODAL CONTROLS ---
document.getElementById('create-timeline-btn').onclick = () => {
  document.getElementById('timeline-modal').style.display = 'block';
};
document.getElementById('close-timeline-modal').onclick = () => {
  document.getElementById('timeline-modal').style.display = 'none';
};
document.getElementById('timeline-form').onsubmit = function(e) {
  e.preventDefault();
  const name = document.getElementById('timeline-name').value.trim();
  const codec = document.getElementById('timeline-codec').value.trim();
  const fps = parseInt(document.getElementById('timeline-fps').value,10);
  const width = parseInt(document.getElementById('timeline-width').value,10);
  const height = parseInt(document.getElementById('timeline-height').value,10);
  const id = 'timeline-' + Date.now();
  projectState.timelines.push({
    id, name, codec, fps, width, height,
    tracks: [
      {id: 'track-'+Date.now()+'-v', type: 'video', enabled: true, items: []}
    ]
  });
  projectState.activeTimelineId = id;
  document.getElementById('timeline-modal').style.display = 'none';
  updateTimelineList();
  updateTimelineSettings();
  updateTimeline();
  updateTimelineMeta();
};
function updateTimelineMeta() {
  const t = getActiveTimeline();
  if (t) {
    document.getElementById('timeline-meta').textContent =
      `${t.name} | ${t.codec} | ${t.fps} FPS | ${t.width}x${t.height}`;
  }
}
function getActiveTimeline() {
  return projectState.timelines.find(t=>t.id===projectState.activeTimelineId);
}
function updateTimelineList() {
  const list = document.getElementById('timeline-list');
  list.innerHTML = '';
  projectState.timelines.forEach(t => {
    const li = document.createElement('li');
    li.textContent = t.name;
    li.className = t.id === projectState.activeTimelineId ? 'selected' : '';
    li.onclick = () => {
      projectState.activeTimelineId = t.id;
      updateTimelineList();
      updateTimelineSettings();
      updateTimeline();
      updateTimelineMeta();
    };
    list.appendChild(li);
  });
}
function updateTimelineSettings() {
  const t = getActiveTimeline();
  const d = document.getElementById('timeline-settings');
  if (!t) { d.textContent = ''; return; }
  d.textContent = `Codec: ${t.codec} | FPS: ${t.fps} | Res: ${t.width}x${t.height}`;
}

// --- PIXI ---
function initPixi() {
  const container = document.getElementById('pixi-canvas-container');
  pixiApp = new PIXI.Application({
    width: 640,
    height: 360,
    backgroundColor: 0x222222,
  });
  container.appendChild(pixiApp.view);
}

// --- MEDIA UPLOAD & THUMBNAILS ---
document.getElementById('media-upload').addEventListener('change', e => {
  const files = Array.from(e.target.files);
  let loaded = 0;
  files.forEach(file => {
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
        if (loaded === files.length) updateMediaList();
      };
      reader.readAsDataURL(file);
    });
  });
});
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
function updateMediaList() {
  const list = document.getElementById('media-list');
  list.innerHTML = '';
  projectState.media.forEach(media => {
    const li = document.createElement('li');
    const img = document.createElement('img');
    img.src = media.thumbnail;
    img.className = 'media-thumb';
    li.appendChild(img);
    li.appendChild(document.createTextNode(media.name));
    li.setAttribute('draggable', 'true');
    li.dataset.mediaId = media.id;
    li.oncontextmenu = e => showContextMenu(e, media);
    li.ondragstart = e => {
      e.dataTransfer.effectAllowed = 'copy';
      e.dataTransfer.setData('media-id', media.id);
    };
    // left-click preview
    li.onclick = () => showPreviewForMedia(media);
    list.appendChild(li);
  });
}

// --- CONTEXT MENU FOR MEDIA FILES ---
function showContextMenu(e, media) {
  e.preventDefault();
  const menu = document.getElementById('context-menu');
  menu.innerHTML = '';
  const t = getActiveTimeline();
  if (t) {
    t.tracks.forEach(track => {
      const option = document.createElement('li');
      option.textContent = `Add to ${track.type.toUpperCase()} Track`;
      option.onclick = () => {
        addMediaToTrack(media, track.id);
        hideContextMenu();
      };
      menu.appendChild(option);
    });
  }
  menu.style.display = 'block';
  menu.style.left = `${e.pageX}px`;
  menu.style.top = `${e.pageY}px`;
}
window.addEventListener('click', hideContextMenu);
function hideContextMenu() {
  const menu = document.getElementById('context-menu');
  menu.style.display = 'none';
}

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
  track.items.push({
    id: 'clip-'+Date.now()+Math.random(),
    mediaId: media.id,
    type: media.type,
    name: media.name,
    src: media.dataUrl,
    start: nextStart,
    duration: 5,
    thumbnail: media.thumbnail
  });
  updateTimeline();
}

// --- TIMELINE & TRACKS ---
function updateTimeline() {
  const t = getActiveTimeline();
  const container = document.getElementById('timeline-tracks');
  if (!t) { container.innerHTML = '<em>No timeline created.</em>'; return; }
  container.innerHTML = '';
  t.tracks.forEach((track, trackIdx) => {
    const row = document.createElement('div');
    row.className = `timeline-track ${track.type} ${track.enabled === false ? 'disabled' : ''}`;
    // Track label and controls
    const label = document.createElement('div');
    label.className = 'timeline-track-label';
    label.textContent = `${track.type.toUpperCase()} ${trackIdx + 1}`;
    const controls = document.createElement('div');
    controls.className = 'timeline-track-controls';
    controls.innerHTML = `<button onclick="removeTrack('${track.id}')">Remove</button>`;
    // Track items container
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
      // --- Resize handles
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
        <button class="remove-clip-btn" title="Remove">&times;</button>
      `;
      // Preview on click (timeline clip = edit preview)
      block.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-clip-btn')) return;
        showPreviewForClip(clip);
        e.stopPropagation();
      });
      // Remove
      block.querySelector('.remove-clip-btn').onclick = (e) => {
        track.items.splice(itemIdx, 1);
        updateTimeline();
        e.stopPropagation();
      };
      items.appendChild(block);
    });

    // Drag-and-drop from media list
    items.ondragover = e => { e.preventDefault(); items.style.background="#205e99"; };
    items.ondragleave = e => { items.style.background=""; };
    items.ondrop = e => {
      e.preventDefault();
      items.style.background="";
      const mediaId = e.dataTransfer.getData('media-id');
      const media = projectState.media.find(m => m.id === mediaId);
      if (media) addMediaToTrack(media, track.id);
    };

    row.appendChild(label);
    row.appendChild(controls);
    row.appendChild(items);
    container.appendChild(row);
  });

  // SortableJS for each track
  t.tracks.forEach(track => {
    const el = document.getElementById(`track-items-${track.id}`);
    if (!el) return;
    if (el._sortable) el._sortable.destroy();
    el._sortable = Sortable.create(el, {
      animation: 150,
      group: { name: 'timeline', pull: true, put: true },
      direction: 'horizontal',
      draggable: '.timeline-clip',
      onEnd: function (evt) {
        const track = t.tracks.find(tr => tr.id === el.getAttribute('data-track-id'));
        if (!track) return;
        const [moved] = track.items.splice(evt.oldIndex, 1);
        track.items.splice(evt.newIndex, 0, moved);
        // Recalculate start times
        let cur = 0;
        track.items.forEach(clip => { clip.start = cur; cur += clip.duration; });
        updateTimeline();
      }
    });
  });
  updatePlayhead();
}
window.removeTrack = function(trackId) {
  const t = getActiveTimeline();
  if (!t) return;
  t.tracks = t.tracks.filter(tr => tr.id !== trackId);
  updateTimeline();
};

// --- CLIP RESIZE HANDLES ---
let resizing = null;
function startResizeClip(e, track, clip, which) {
  e.preventDefault();
  resizing = {track, clip, which, startX: e.clientX, origDuration: clip.duration, origStart: clip.start};
  document.body.style.cursor = 'ew-resize';
}
window.addEventListener('mousemove', e => {
  if (!resizing) return;
  const t = getActiveTimeline();
  const px = e.clientX - resizing.startX;
  const deltaSec = px * SECONDS_PER_PIXEL;
  if (resizing.which === 'right') {
    resizing.clip.duration = Math.max(1, resizing.origDuration + deltaSec);
  } else if (resizing.which === 'left') {
    const newStart = resizing.origStart + deltaSec;
    const newDuration = resizing.origDuration - deltaSec;
    if (newDuration > 1 && newStart >= 0) {
      resizing.clip.start = newStart;
      resizing.clip.duration = newDuration;
    }
  }
  // After resizing, reorder all following clips
  const track = resizing.track;
  const idx = track.items.indexOf(resizing.clip);
  let cur = track.items[0].start;
  for (let i = 0; i < track.items.length; ++i) {
    if (i === idx) {
      track.items[i].start = resizing.clip.start;
      cur = resizing.clip.start + resizing.clip.duration;
    } else if (i > idx) {
      track.items[i].start = cur;
      cur += track.items[i].duration;
    }
  }
  updateTimeline();
});
window.addEventListener('mouseup', e => {
  if (resizing) {
    resizing = null;
    document.body.style.cursor = '';
  }
});

// --- PREVIEW LOGIC ---
function showPreviewForMedia(media) {
  // Project window preview ONLY for media files (not timeline clips)
  const img = document.getElementById('pixi-canvas-container');
  img.innerHTML = '';
  if (media.type === 'image') {
    const i = new window.Image();
    i.src = media.dataUrl;
    i.style.maxWidth = "100%";
    i.style.maxHeight = "300px";
    img.appendChild(i);
  } else if (media.type === 'audio') {
    const audio = document.createElement('audio');
    audio.src = media.dataUrl;
    audio.controls = true;
    img.appendChild(audio);
  } else if (media.type === 'video') {
    const video = document.createElement('video');
    video.src = media.dataUrl;
    video.controls = true;
    video.style.maxWidth = "100%";
    video.style.maxHeight = "300px";
    img.appendChild(video);
  }
}
function showPreviewForClip(clip) {
  // Timeline clips preview in Edit Preview window
  const img = document.getElementById('preview-canvas');
  const audio = document.getElementById('preview-audio');
  const video = document.getElementById('preview-video');
  audio.style.display = "none";
  video.style.display = "none";
  if (clip.type === 'image') {
    const i = new window.Image();
    i.onload = function () {
      const ctx = img.getContext('2d');
      ctx.clearRect(0, 0, img.width, img.height);
      ctx.drawImage(i, 0, 0, img.width, img.height);
    };
    i.src = clip.src;
  } else if (clip.type === 'audio') {
    audio.src = clip.src;
    audio.style.display = "block";
    audio.play();
    const ctx = img.getContext('2d');
    ctx.clearRect(0, 0, img.width, img.height);
  } else if (clip.type === 'video') {
    video.src = clip.src;
    video.style.display = "block";
    video.play();
    const ctx = img.getContext('2d');
    ctx.clearRect(0, 0, img.width, img.height);
  }
}

// --- PLAYHEAD & CONTROLS ---
let playInterval = null;
let playhead = 0;
function updatePlayhead() {
  const t = getActiveTimeline();
  if (!t) return;
  const timelineHolder = document.getElementById('timeline-holder');
  const playheadDiv = document.getElementById('timeline-playhead');
  const px = playhead / SECONDS_PER_PIXEL;
  playheadDiv.style.left = px + 'px';
  playheadDiv.style.height = (timelineHolder.offsetHeight || 100) + 'px';
}
document.getElementById('play-btn').onclick = () => {
  if (playInterval) return;
  const t = getActiveTimeline();
  if (!t) return;
  let maxEnd = 0;
  t.tracks.forEach(track => {
    track.items.forEach(clip => {
      maxEnd = Math.max(maxEnd, clip.start + clip.duration);
    });
  });
  playInterval = setInterval(() => {
    updatePlayhead();
    let found = false;
    t.tracks.forEach(track => {
      for (const clip of track.items) {
        if (playhead >= clip.start && playhead < clip.start + clip.duration) {
          found = true;
          showPreviewForClip(clip);
          break;
        }
      }
    });
    playhead += 1 / (t.fps||30);
    if (playhead > maxEnd) document.getElementById('stop-btn').onclick();
  }, 1000 / (t.fps || 30));
};
document.getElementById('pause-btn').onclick = () => {
  clearInterval(playInterval);
  playInterval = null;
};
document.getElementById('stop-btn').onclick = () => {
  clearInterval(playInterval);
  playInterval = null;
  playhead = 0;
  updatePlayhead();
};

// --- PROJECT SAVE/LOAD ---
document.getElementById('save-btn').addEventListener('click', function () {
  const dataStr = JSON.stringify(projectState);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = "my_project.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});
document.getElementById('load-project-file').addEventListener('change', function(event) {
  if (event.target.files.length > 0) {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const loadedState = JSON.parse(e.target.result);
        if (loadedState && Array.isArray(loadedState.media)) {
          projectState = loadedState;
          updateMediaList();
          updateTimelineList();
          updateTimelineSettings();
          updateTimeline();
          updateTimelineMeta();
        } else {
          alert("Invalid project file.");
        }
      } catch (err) {
        alert("Failed to load project file.");
      }
    };
    reader.readAsText(file);
  }
});

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
  initPixi();
  updateMediaList();
  updateTimelineList();
  updateTimelineSettings();
  updateTimeline();
  updateTimelineMeta();
  updatePlayhead();
});
function formatTime(secs) {
  const m = Math.floor(secs / 60);
  const s = Math.round(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}