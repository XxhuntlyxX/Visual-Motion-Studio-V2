// --- Core data structure ---
let pixiApp;
let selectedFiles = [];
let projectState = {
  tracks: [],
  timelineLength: 60 // seconds
};

const SECONDS_PER_PIXEL = 0.2; // 1 second = 5px width, adjust for zoom/scroll

// --- Utility Functions ---
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
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('audio/')) return 'audio';
  return 'other';
}

function formatTime(secs) {
  const m = Math.floor(secs / 60);
  const s = Math.round(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// --- Pixi initialization ---
function initPixi() {
  const container = document.getElementById('pixi-canvas-container');
  pixiApp = new PIXI.Application({
    width: 640,
    height: 360,
    backgroundColor: 0x222222,
  });
  container.appendChild(pixiApp.view);
  updatePixiStage();
}

// --- Media Import & Preview ---
document.getElementById('media-upload').addEventListener('change', function (event) {
  selectedFiles = Array.from(event.target.files);
  updateTempMediaList();
  showPreviewForFile(selectedFiles[selectedFiles.length-1]);
});

function updateTempMediaList() {
  const mediaList = document.getElementById('media-list');
  mediaList.innerHTML = '';
  selectedFiles.forEach(file => {
    const type = getMediaType(file);
    const listItem = document.createElement('li');
    listItem.textContent = file.name + " (not in project)";
    listItem.style.color = "#aaa";
    listItem.style.fontStyle = "italic";
    listItem.addEventListener('click', () => showPreviewForFile(file));
    mediaList.appendChild(listItem);
  });
}

function showPreviewForFile(file) {
  if (!file) return;
  const img = document.getElementById('preview-canvas');
  const audio = document.getElementById('preview-audio');
  const video = document.getElementById('preview-video');
  audio.style.display = "none";
  video.style.display = "none";
  if (getMediaType(file) === 'image') {
    const reader = new FileReader();
    reader.onload = function (e) {
      const i = new window.Image();
      i.onload = function () {
        const ctx = img.getContext('2d');
        ctx.clearRect(0, 0, img.width, img.height);
        ctx.drawImage(i, 0, 0, img.width, img.height);
      };
      i.src = e.target.result;
    };
    reader.readAsDataURL(file);
  } else if (getMediaType(file) === 'audio') {
    const url = URL.createObjectURL(file);
    audio.src = url;
    audio.style.display = "block";
    audio.play();
    const ctx = img.getContext('2d');
    ctx.clearRect(0, 0, img.width, img.height);
  } else if (getMediaType(file) === 'video') {
    const url = URL.createObjectURL(file);
    video.src = url;
    video.style.display = "block";
    video.play();
    const ctx = img.getContext('2d');
    ctx.clearRect(0, 0, img.width, img.height);
  }
}

// --- Upload to Project: Adds as new clips to a selected track ---
document.getElementById('upload-btn').addEventListener('click', function () {
  if (selectedFiles.length === 0) return;
  let targetTrackIdx = projectState.tracks.length ? 0 : null;
  if (projectState.tracks.length > 1) {
    let promptStr = "Upload to which track?\n" +
      projectState.tracks.map((t,i)=>`${i+1}: ${t.type.toUpperCase()} ${i+1}`).join('\n');
    targetTrackIdx = parseInt(prompt(promptStr, "1")) - 1;
    if (isNaN(targetTrackIdx) || targetTrackIdx < 0 || targetTrackIdx >= projectState.tracks.length) return alert("Invalid track.");
  }
  if (targetTrackIdx===null) {
    alert("No tracks available. Please add a video or audio track first.");
    return;
  }
  const track = projectState.tracks[targetTrackIdx];
  let nextStart = 0;
  if (track.items.length > 0) {
    const last = track.items[track.items.length-1];
    nextStart = last.start + last.duration;
  }
  let filesLeft = selectedFiles.length;
  selectedFiles.forEach(file => {
    const type = getMediaType(file);
    if ((track.type === 'audio' && type !== 'audio') || (track.type === 'video' && type === 'audio'))
      return;
    let duration = 5;
    if (type === 'audio' || type === 'video') {
      const url = URL.createObjectURL(file);
      const el = document.createElement(type);
      el.src = url;
      el.addEventListener('loadedmetadata', function () {
        duration = el.duration || 5;
        addClipToTrack(file, type, duration);
        URL.revokeObjectURL(url);
      }, {once:true});
      el.load();
    } else {
      addClipToTrack(file, type, duration);
    }
  });

  function addClipToTrack(file, type, duration) {
    generateThumbnail(file, type, thumbnail => {
      const reader = new FileReader();
      reader.onload = function (e) {
        track.items.push({
          id: 'clip-'+Date.now()+Math.random(),
          type,
          name: file.name,
          src: e.target.result,
          start: nextStart,
          duration: duration,
          thumbnail
        });
        nextStart += duration;
        filesLeft--;
        if (filesLeft === 0) {
          updateProjectMediaList();
          updatePixiStage();
          updateTimeline();
          selectedFiles = [];
          document.getElementById('media-upload').value = "";
          updateTempMediaList();
        }
      };
      reader.readAsDataURL(file);
    });
  }
});

// --- Project Media List (shows all clips in all tracks) ---
function updateProjectMediaList() {
  const mediaList = document.getElementById('media-list');
  mediaList.innerHTML = '';
  projectState.tracks.forEach((track, tIdx) => {
    track.items.forEach((clip, idx) => {
      const listItem = document.createElement('li');
      listItem.textContent = `[${track.type.toUpperCase()} ${tIdx+1}] ${clip.name}`;
      listItem.classList.add('in-project');
      listItem.addEventListener('click', () => showPreviewForClip(clip));
      mediaList.appendChild(listItem);
    });
  });
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

// --- Project Save/Load ---
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
        if (loadedState && Array.isArray(loadedState.tracks)) {
          projectState = loadedState;
          updatePixiStage();
          updateProjectMediaList();
          updateTimeline();
          selectedFiles = [];
          document.getElementById('media-upload').value = "";
          updateTempMediaList();
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

// --- Pixi Stage (show first video/image on enabled video tracks) ---
function updatePixiStage() {
  if (!pixiApp) return;
  pixiApp.stage.removeChildren();
  const videoTrack = projectState.tracks.find(t => t.type === 'video' && t.enabled !== false && t.items.length);
  if (videoTrack) {
    const media = videoTrack.items[0];
    if (media.type === 'image' || media.type === 'video') {
      const texture = PIXI.Texture.from(media.src);
      const sprite = new PIXI.Sprite(texture);
      sprite.width = pixiApp.screen.width;
      sprite.height = pixiApp.screen.height;
      pixiApp.stage.addChild(sprite);
    }
  }
}

// --- Timeline Rendering (SortableJS Integration) ---
function updateTimeline() {
  const container = document.getElementById('timeline-tracks');
  container.innerHTML = '';
  projectState.tracks.forEach((track, trackIdx) => {
    const row = document.createElement('div');
    row.className = `timeline-track ${track.type} ${track.enabled === false ? 'disabled' : ''} ${track.type === 'audio' && track.solo ? 'solo' : ''} ${track.type === 'audio' && track.mute ? 'muted' : ''}`;

    // Track label and controls
    const label = document.createElement('div');
    label.className = 'timeline-track-label';
    label.textContent = `${track.type.toUpperCase()} ${trackIdx + 1}`;

    const controls = document.createElement('div');
    controls.className = 'timeline-track-controls';
    if (track.type === 'audio') {
      controls.innerHTML = `
        <button onclick="toggleMute(${trackIdx})">${track.mute ? 'Unmute' : 'Mute'}</button>
        <button onclick="toggleSolo(${trackIdx})">${track.solo ? 'Unsolo' : 'Solo'}</button>
      `;
    }
    if (track.type === 'video') {
      controls.innerHTML = `
        <button onclick="toggleTrack(${trackIdx})">${track.enabled === false ? 'Enable' : 'Disable'}</button>
      `;
    }
    controls.innerHTML += `<button onclick="removeTrack(${trackIdx})">Remove</button>`;

    // Track items
    const items = document.createElement('div');
    items.className = 'timeline-track-items';
    items.id = `track-items-${trackIdx}`;
    items.setAttribute('data-track-idx', trackIdx);

    track.items.forEach((clip, itemIdx) => {
      const left = clip.start / SECONDS_PER_PIXEL;
      const width = clip.duration / SECONDS_PER_PIXEL;
      const block = document.createElement('div');
      block.className = `timeline-clip ${track.type}`;
      block.style.left = left + 'px';
      block.style.width = width + 'px';
      block.setAttribute('data-clip-idx', itemIdx);
      block.setAttribute('data-track-idx', trackIdx);
      block.innerHTML = `
        <img src="${clip.thumbnail}" class="timeline-clip-thumbnail">
        <div class="timeline-clip-label">${clip.name}</div>
        <div class="timeline-clip-time">${formatTime(clip.start)} – ${formatTime(clip.start + clip.duration)}</div>
        <button class="remove-clip-btn" title="Remove">&times;</button>
      `;
      // Preview on click
      block.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-clip-btn')) return;
        showPreviewForClip(clip);
        e.stopPropagation();
      });
      // Remove
      block.querySelector('.remove-clip-btn').onclick = (e) => {
        track.items.splice(itemIdx, 1);
        updateProjectMediaList();
        updateTimeline();
        updatePixiStage();
        e.stopPropagation();
      };
      items.appendChild(block);
    });

    row.appendChild(label);
    row.appendChild(controls);
    row.appendChild(items);
    container.appendChild(row);
  });

  // SortableJS integration for each track
  projectState.tracks.forEach((track, trackIdx) => {
    const el = document.getElementById(`track-items-${trackIdx}`);
    if (!el) return;
    if (el._sortable) {
      el._sortable.destroy();
    }
    el._sortable = Sortable.create(el, {
      animation: 150,
      group: { name: 'timeline', pull: true, put: true },
      direction: 'horizontal',
      draggable: '.timeline-clip',
      onEnd: function (evt) {
        const fromTrackIdx = parseInt(evt.from.getAttribute('data-track-idx'));
        const toTrackIdx = parseInt(evt.to.getAttribute('data-track-idx'));
        if (isNaN(fromTrackIdx) || isNaN(toTrackIdx)) return;
        const [moved] = projectState.tracks[fromTrackIdx].items.splice(evt.oldIndex, 1);
        projectState.tracks[toTrackIdx].items.splice(evt.newIndex, 0, moved);
        [fromTrackIdx, toTrackIdx].forEach(tIdx => {
          let cur = 0;
          projectState.tracks[tIdx].items.forEach(clip => {
            clip.start = cur;
            cur += clip.duration;
          });
        });
        updateTimeline();
        updateProjectMediaList();
        updatePixiStage();
      }
    });
  });
}

// --- Timeline logic: Track Controls ---
window.toggleMute = function(idx) {
  projectState.tracks[idx].mute = !projectState.tracks[idx].mute;
  updateTimeline();
};
window.toggleSolo = function(idx) {
  projectState.tracks[idx].solo = !projectState.tracks[idx].solo;
  updateTimeline();
};
window.toggleTrack = function(idx) {
  projectState.tracks[idx].enabled = !projectState.tracks[idx].enabled;
  updateTimeline();
  updatePixiStage();
};
window.removeTrack = function(idx) {
  if (!confirm("Remove this track?")) return;
  projectState.tracks.splice(idx, 1);
  updateTimeline();
  updateProjectMediaList();
  updatePixiStage();
};

document.getElementById('add-video-track').onclick = () => {
  projectState.tracks.push({id: 'video-'+Date.now(), type: 'video', enabled: true, items: []});
  updateTimeline();
};
document.getElementById('add-audio-track').onclick = () => {
  projectState.tracks.push({id: 'audio-'+Date.now(), type: 'audio', enabled: true, solo: false, mute: false, items: []});
  updateTimeline();
};

// --- App Init ---
document.addEventListener('DOMContentLoaded', () => {
  initPixi();
  updateProjectMediaList();
  updateTempMediaList();
  updateTimeline();
});