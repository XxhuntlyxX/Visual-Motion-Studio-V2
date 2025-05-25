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
  updatePixiStage();
}

// Handle file selection for temporary preview (not project yet)
document.getElementById('media-upload').addEventListener('change', function (event) {
  selectedFiles = Array.from(event.target.files);
  updateTempMediaList();

  // Preview the last image file selected, if any
  let lastImageFile = selectedFiles.filter(f => f.type.startsWith('image/')).pop();
  if (lastImageFile) {
    const reader = new FileReader();
    reader.onload = function (e) {
      previewImage(e.target.result);
    };
    reader.readAsDataURL(lastImageFile);
  }
});

function updateTempMediaList() {
  const mediaList = document.getElementById('media-list');
  mediaList.innerHTML = '';
  selectedFiles.forEach(file => {
    const listItem = document.createElement('li');
    listItem.textContent = file.name + " (not in project)";
    listItem.style.color = "#aaa";
    listItem.style.fontStyle = "italic";
    listItem.addEventListener('click', () => previewSelectedFile(file));
    mediaList.appendChild(listItem);
  });
}

function previewSelectedFile(file) {
  if (file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = function (e) {
      previewImage(e.target.result);
    };
    reader.readAsDataURL(file);
  }
}

function previewImage(dataUrl) {
  const img = new Image();
  img.onload = function () {
    const previewCanvas = document.getElementById('preview-canvas');
    const ctx = previewCanvas.getContext('2d');
    ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    ctx.drawImage(img, 0, 0, previewCanvas.width, previewCanvas.height);
  };
  img.src = dataUrl;
}

// Upload to Project: Move selectedFiles into projectState and clear selection
document.getElementById('upload-btn').addEventListener('click', function () {
  if (selectedFiles.length > 0 && pixiApp) {
    let readersLeft = selectedFiles.length;
    selectedFiles.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = function (e) {
          if (!projectState.media.some(m => m.name === file.name && m.dataUrl === e.target.result)) {
            projectState.media.push({ name: file.name, dataUrl: e.target.result });
          }
          readersLeft--;
          if (readersLeft === 0) {
            updateProjectMediaList();
            updatePixiStage();
            updateTimeline();
            selectedFiles = [];
            document.getElementById('media-upload').value = "";
            updateTempMediaList();
          }
        };
        reader.readAsDataURL(file);
      } else {
        readersLeft--;
        if (readersLeft === 0) {
          updateProjectMediaList();
          updatePixiStage();
          updateTimeline();
          selectedFiles = [];
          document.getElementById('media-upload').value = "";
          updateTempMediaList();
        }
      }
    });
  }
});

function updateProjectMediaList() {
  const mediaList = document.getElementById('media-list');
  mediaList.innerHTML = '';
  projectState.media.forEach(media => {
    const listItem = document.createElement('li');
    listItem.textContent = media.name;
    listItem.classList.add('in-project');
    listItem.addEventListener('click', () => previewImage(media.dataUrl));
    mediaList.appendChild(listItem);
  });
}

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

// --- TIMELINE ---

function updateTimeline() {
  const timeline = document.getElementById('timeline');
  timeline.innerHTML = '';
  projectState.media.forEach((media, idx) => {
    const block = document.createElement('div');
    block.className = 'timeline-block';
    block.textContent = media.name;
    block.setAttribute('draggable', 'true');
    block.dataset.idx = idx;

    // Preview on click
    block.addEventListener('click', (e) => {
      previewImage(media.dataUrl);
    });

    // Drag and drop handlers
    block.addEventListener('dragstart', (e) => {
      block.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', idx);
    });

    block.addEventListener('dragend', (e) => {
      block.classList.remove('dragging');
      Array.from(timeline.children).forEach(b => b.classList.remove('over'));
    });

    block.addEventListener('dragover', (e) => {
      e.preventDefault();
      block.classList.add('over');
    });

    block.addEventListener('dragleave', (e) => {
      block.classList.remove('over');
    });

    block.addEventListener('drop', (e) => {
      e.preventDefault();
      block.classList.remove('over');
      const fromIdx = parseInt(e.dataTransfer.getData('text/plain'));
      const toIdx = Number(block.dataset.idx);
      if (fromIdx !== toIdx) {
        moveMediaInProject(fromIdx, toIdx);
      }
    });

    timeline.appendChild(block);
  });
}

function moveMediaInProject(fromIdx, toIdx) {
  // Move the media item in projectState.media
  const item = projectState.media.splice(fromIdx, 1)[0];
  projectState.media.splice(toIdx, 0, item);
  updateTimeline();
  updateProjectMediaList();
  updatePixiStage();
}

// ---

document.addEventListener('DOMContentLoaded', () => {
  initPixi();
  updateProjectMediaList();
  updateTempMediaList();
  updateTimeline();
});