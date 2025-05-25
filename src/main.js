let pixiApp;
let selectedFiles = [];
let projectState = {
  media: [] // Each { name, dataUrl }
};

// Initialize PixiJS in the project window
function initPixi() {
  const container = document.getElementById('pixi-canvas-container');
  pixiApp = new PIXI.Application({
    width: 640,
    height: 360,
    backgroundColor: 0x222222,
  });
  container.appendChild(pixiApp.view);
  // On load, populate with any existing projectState.media
  updatePixiStage();
}

// Handle media uploads and display file list
document.getElementById('media-upload').addEventListener('change', function (event) {
  selectedFiles = Array.from(event.target.files);
  const mediaList = document.getElementById('media-list');
  mediaList.innerHTML = '';
  let lastImageFile = null;
  for (const file of selectedFiles) {
    const listItem = document.createElement('li');
    listItem.textContent = file.name;
    mediaList.appendChild(listItem);
    if (file.type.startsWith('image/')) lastImageFile = file;
  }
  // Preview the last image file selected
  if (lastImageFile) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const img = new Image();
      img.onload = function () {
        const previewCanvas = document.getElementById('preview-canvas');
        const ctx = previewCanvas.getContext('2d');
        ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
        ctx.drawImage(img, 0, 0, previewCanvas.width, previewCanvas.height);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(lastImageFile);
  }
});

// Upload to Project button: add all selected images to PixiJS project window and projectState
document.getElementById('upload-btn').addEventListener('click', function () {
  if (selectedFiles.length > 0 && pixiApp) {
    selectedFiles.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = function (e) {
          // Add to project state if not already present (avoid duplicates by name and dataUrl)
          if (!projectState.media.some(m => m.name === file.name && m.dataUrl === e.target.result)) {
            projectState.media.push({ name: file.name, dataUrl: e.target.result });
          }
          // Add to PixiJS stage
          const texture = PIXI.Texture.from(e.target.result);
          const sprite = new PIXI.Sprite(texture);
          sprite.width = pixiApp.screen.width;
          sprite.height = pixiApp.screen.height;
          pixiApp.stage.addChild(sprite);
        };
        reader.readAsDataURL(file);
      }
    });
  }
});

// Save Project button
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

// Load Project file input
document.getElementById('load-project-file').addEventListener('change', function(event) {
  if (event.target.files.length > 0) {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const loadedState = JSON.parse(e.target.result);
        if (loadedState && Array.isArray(loadedState.media)) {
          projectState = loadedState;
          updatePixiStage();
          updateMediaList();
          updatePreview();
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

// Update PixiJS stage with all media in projectState
function updatePixiStage() {
  if (pixiApp) {
    pixiApp.stage.removeChildren();
    projectState.media.forEach(media => {
      const texture = PIXI.Texture.from(media.dataUrl);
      const sprite = new PIXI.Sprite(texture);
      sprite.width = pixiApp.screen.width;
      sprite.height = pixiApp.screen.height;
      pixiApp.stage.addChild(sprite);
    });
  }
}

// Update media-list UI from projectState
function updateMediaList() {
  const mediaList = document.getElementById('media-list');
  mediaList.innerHTML = '';
  projectState.media.forEach(media => {
    const listItem = document.createElement('li');
    listItem.textContent = media.name;
    mediaList.appendChild(listItem);
  });
}

// Preview the last image from projectState
function updatePreview() {
  if (projectState.media.length === 0) return;
  const lastMedia = projectState.media[projectState.media.length - 1];
  const img = new Image();
  img.onload = function () {
    const previewCanvas = document.getElementById('preview-canvas');
    const ctx = previewCanvas.getContext('2d');
    ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    ctx.drawImage(img, 0, 0, previewCanvas.width, previewCanvas.height);
  };
  img.src = lastMedia.dataUrl;
}

// Clicking on a filename in the list previews that image
document.getElementById('media-list').addEventListener('click', function (e) {
  if (e.target.tagName === 'LI') {
    const media = projectState.media.find(m => m.name === e.target.textContent);
    if (media) {
      const img = new Image();
      img.onload = function () {
        const previewCanvas = document.getElementById('preview-canvas');
        const ctx = previewCanvas.getContext('2d');
        ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
        ctx.drawImage(img, 0, 0, previewCanvas.width, previewCanvas.height);
      };
      img.src = media.dataUrl;
    }
  }
});

// (Optional) Example: Simple threshold (rotoscoping-like) effect
function applyRotoscopingEffect(canvas, context) {
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
    const val = avg > 128 ? 255 : 0;
    data[i] = data[i + 1] = data[i + 2] = val;
  }
  context.putImageData(imageData, 0, 0);
}

// Initialize PixiJS on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  initPixi();
});