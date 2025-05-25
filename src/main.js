let pixiApp;
let selectedFiles = [];

// Initialize PixiJS in the project window
function initPixi() {
  const container = document.getElementById('pixi-canvas-container');
  pixiApp = new PIXI.Application({
    width: 640,
    height: 360,
    backgroundColor: 0x222222,
  });
  container.appendChild(pixiApp.view);
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

// Upload to Project button: add all selected images to PixiJS project window
document.getElementById('upload-btn').addEventListener('click', function () {
  if (selectedFiles.length > 0 && pixiApp) {
    pixiApp.stage.removeChildren();
    selectedFiles.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = function (e) {
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

// Optional: Clicking on a file in the list previews and applies the effect
document.getElementById('media-list').addEventListener('click', function (e) {
  if (e.target.tagName === 'LI') {
    const file = selectedFiles.find(f => f.name === e.target.textContent);
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = function (ev) {
        const img = new Image();
        img.onload = function () {
          const previewCanvas = document.getElementById('preview-canvas');
          const ctx = previewCanvas.getContext('2d');
          ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
          ctx.drawImage(img, 0, 0, previewCanvas.width, previewCanvas.height);
          // Uncomment to apply rotoscoping effect:
          // applyRotoscopingEffect(previewCanvas, ctx);
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    }
  }
});

// Example: Simple threshold (rotoscoping-like) effect
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