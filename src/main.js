let pixiApp;
let selectedFiles = []; // buffer for pending uploads (not in project until "Upload to Project")
let projectState = {
  media: [],
  timelines: [],
  activeTimelineId: null
};
const SECONDS_PER_PIXEL = 0.2;

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

// ---- PIXI ----
function initPixi() {
  const container = document.getElementById('pixi-canvas-container');
  pixiApp = new PIXI.Application({
    width: 640,
    height: 360,
    backgroundColor: 0x222222,
  });
  container.appendChild(pixiApp.view);
}

// ---- MEDIA UPLOAD/BUFFER ----
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
    li.onclick = () => showPreviewForMedia(media);
    list.appendChild(li);
  });
}

// ---- CONTEXT MENU ----
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
  document.getElementById('context-menu').style.display = 'none';
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
  let duration = 5;
  if (media.type === 'audio' || media.type === 'video') {
    // Can't get true duration here; could be enhanced to probe via <audio>/<video> if needed
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

// ---- TIMELINE ----
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

    // Timeline tracks column
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
  // Make timeline horizontally scrollable for long timelines
  tracksCol.scrollLeft = Math.max(0, playheadPx - 100);
  updatePlayhead();
}
// ---- CLIP RESIZE HANDLES ----
let resizing = null;
function startResizeClip(e, track, clip, which) {
  e.preventDefault();
  resizing = {track, clip, which, startX: e.clientX, origDuration: clip.duration, origStart: clip.start};
  document.body.style.cursor = 'ew-resize';
}
window.addEventListener('mousemove', e => {
  if (!resizing) return;
  const px = e.clientX - resizing.startX;
  const deltaSec = px * SECONDS_PER_PIXEL;
  if (resizing.which === 'right') {
    if (resizing.clip.type === 'image') {
      resizing.clip.duration = Math.max(5, Math.min(60, resizing.origDuration + deltaSec));
    } else {
      resizing.clip.duration = Math.max(1, resizing.origDuration + deltaSec);
    }
  } else if (resizing.which === 'left') {
    let newStart = resizing.origStart + deltaSec;
    let newDuration = resizing.origDuration - deltaSec;
    if (resizing.clip.type === 'image') {
      if (newDuration >= 5 && newDuration <= 60 && newStart >= 0) {
        resizing.clip.start = newStart;
        resizing.clip.duration = newDuration;
      }
    } else {
      if (newDuration >= 1 && newStart >= 0) {
        resizing.clip.start = newStart;
        resizing.clip.duration = newDuration;
      }
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

// ---- PREVIEW LOGIC ----
function showPreviewForMedia(media) {
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

// ---- PLAYHEAD & CONTROLS ----
let playInterval = null;
let playhead = 0;
function updatePlayhead() {
  const tracksCol = document.getElementById('timeline-tracks-col');
  const playheadDiv = document.getElementById('timeline-playhead');
  if (tracksCol && playheadDiv) {
    playheadDiv.style.left = (window.playhead || 0) / SECONDS_PER_PIXEL + 'px';
    playheadDiv.style.height = tracksCol.offsetHeight + 'px';
  }
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
  window.playhead = 0;
  updatePlayhead();
};

window.toggleMute = function(id) {
  const t = getActiveTimeline();
  if (!t) return;
  const track = t.tracks.find(tr => tr.id === id);
  if (track) { track.mute = !track.mute; updateTimeline(); }
};
window.toggleSolo = function(id) {
  const t = getActiveTimeline();
  if (!t) return;
  const track = t.tracks.find(tr => tr.id === id);
  if (track) { track.solo = !track.solo; updateTimeline(); }
};
window.toggleTrack = function(id) {
  const t = getActiveTimeline();
  if (!t) return;
  const track = t.tracks.find(tr => tr.id === id);
  if (track) { track.enabled = !track.enabled; updateTimeline(); }
};
window.removeTrack = function(id) {
  const t = getActiveTimeline();
  if (!t) return;
  t.tracks = t.tracks.filter(tr => tr.id !== id);
  updateTimeline();
};
// ---- PROJECT SAVE/LOAD ----
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
// ---- INIT ----
document.addEventListener('DOMContentLoaded', () => {
  initPixi();
  updateMediaList();
  updateTimelineList();
  updateTimelineSettings();
  updateTimeline();
  updateTimelineMeta();
  updatePendingUploads();
  updatePlayhead();
});
function formatTime(secs) {
  const m = Math.floor(secs / 60);
  const s = Math.round(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}