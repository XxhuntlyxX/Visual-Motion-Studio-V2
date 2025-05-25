// Import PixiJS if using npm (uncomment if using modules)
// import * as PIXI from 'pixi.js';

let pixiApp;

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
  const mediaList = document.getElementById('media-list');
  mediaList.innerHTML = '';
  for (const file of event.target.files) {
    const listItem = document.createElement('li');
    listItem.textContent = file.name;
    mediaList.appendChild(listItem);

    // Auto-preview the first image file
    if (file.type.startsWith('image/') && mediaList.children.length === 1) {
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
      reader.readAsDataURL(file);
    }
  }
});

// Example: Apply a simple "threshold" effect (rotoscoping-like edge detection)
function applyRotoscopingEffect(canvas, context) {
  // Get image data
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    // Simple threshold: if brightness > 128, set to white, else black
    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
    const val = avg > 128 ? 255 : 0;
    data[i] = data[i + 1] = data[i + 2] = val;
  }
  context.putImageData(imageData, 0, 0);
}

// Example: Display selected media in preview and apply effect
document.getElementById('media-list').addEventListener('click', function (e) {
  if (e.target.tagName === 'LI') {
    // Find the file from input by name
    const input = document.getElementById('media-upload');
    const file = Array.from(input.files).find(f => f.name === e.target.textContent);
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = function (ev) {
        const img = new Image();
        img.onload = function () {
          const previewCanvas = document.getElementById('preview-canvas');
          const ctx = previewCanvas.getContext('2d');
          // Clear and draw image
          ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
          ctx.drawImage(img, 0, 0, previewCanvas.width, previewCanvas.height);
          // Apply simple rotoscoping effect
          applyRotoscopingEffect(previewCanvas, ctx);
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    }
  }
});

// Initialize everything on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  initPixi();
});