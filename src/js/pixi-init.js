import * as PIXI from "https://unpkg.com/pixi.js@8.0.0/dist/pixi.mjs";

export let pixiApp = null;

export async function initPixi() {
  const container = document.getElementById('pixi-canvas-container');
  container.innerHTML = "";
  pixiApp = await PIXI.Application.init({
    width: 640,
    height: 360,
    background: 0x222222,
  });
  container.appendChild(pixiApp.canvas);
}