import * as PIXI from 'https://cdn.skypack.dev/pixi.js';

export let pixiApp = null;

export async function initPixi() {
  const container = document.getElementById('pixi-canvas-container');
  container.innerHTML = "";

  // PixiJS v8+ requires async initialization
  pixiApp = await PIXI.Application.init({
    width: 640,
    height: 360,
    background: 0x222222,
  });

  container.appendChild(pixiApp.canvas); // Was .view, now .canvas in v8+
}