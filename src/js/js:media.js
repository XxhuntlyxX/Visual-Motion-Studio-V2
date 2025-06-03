import { addMedia, getSelectedFiles, setSelectedFiles, clearSelectedFiles, projectState } from './state.js';
import { getMediaType } from './utils.js';
import { addMediaToTrack, getActiveTimeline, updateTimeline } from './timeline.js';

export function setupMediaUpload(updatePendingUploads, updateMediaList, showPreviewForMedia) {
  document.getElementById('media-upload').addEventListener('change', e => {
    setSelectedFiles(Array.from(e.target.files));
    updatePendingUploads();
  });
  document.getElementById('upload-to-project-btn').addEventListener('click', () => {
    const files = getSelectedFiles();
    if (!files.length) return;
    let loaded = 0;
    files.forEach(file => {
      const type = getMediaType(file);
      generateThumbnail(file, type, thumb => {
        const reader = new FileReader();
        reader.onload = function(ev) {
          addMedia({
            id: 'media-'+Date.now()+Math.random(),
            name: file.name,
            type,
            dataUrl: ev.target.result,
            thumbnail: thumb
          });
          loaded++;
          if (loaded === files.length) {
            updateMediaList(showPreviewForMedia);
            clearSelectedFiles();
            updatePendingUploads();
          }
        };
        reader.readAsDataURL(file);
      });
    });
  });
}
export function generateThumbnail(file, type, cb) {
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
export function updatePendingUploads() {
  const d = document.getElementById('pending-uploads');
  const files = getSelectedFiles();
  if (!files.length) {
    d.innerHTML = '';
    return;
  }
  d.innerHTML = `<strong>Pending Upload:</strong><ul>${
    files.map(f=>`<li>${f.name}</li>`).join('')
  }</ul>`;
}
export function updateMediaList(showPreviewForMedia) {
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

    // Right-click context menu: Add to track
    li.oncontextmenu = e => {
      e.preventDefault();
      showMediaContextMenu(e, media);
    };

    // Drag and drop
    li.ondragstart = e => {
      e.dataTransfer.effectAllowed = 'copy';
      e.dataTransfer.setData('media-id', media.id);
    };

    li.onclick = () => showPreviewForMedia(media);
    list.appendChild(li);
  });
}

// Show context menu for media item (add to tracks)
function showMediaContextMenu(e, media) {
  let menu = document.getElementById('context-menu');
  menu.innerHTML = '';
  const t = getActiveTimeline();
  if (t) {
    t.tracks.forEach(track => {
      const option = document.createElement('li');
      option.textContent = `Add to ${track.type.toUpperCase()} Track`;
      option.onclick = () => {
        addMediaToTrack(media, track.id);
        hideContextMenu();
        updateTimeline();
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
  let menu = document.getElementById('context-menu');
  if (menu) menu.style.display = 'none';
}

export function showPreviewForMedia(media) {
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