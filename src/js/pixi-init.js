import * as PIXI from 'pixi.js';

export let pixiApp = null;

export function initPixi() {
  const container = document.getElementById('pixi-canvas-container');
  container.innerHTML = ""; // Clear existing canvas if any
  pixiApp = new PIXI.Application({
    width: 640,
    height: 360,
    backgroundColor: 0x222222,
  });
  container.appendChild(pixiApp.view);
}