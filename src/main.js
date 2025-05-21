import { Canvas } from './components/Canvas.js';

document.addEventListener('DOMContentLoaded', () => {
  const app = document.getElementById('app');
  const canvasElement = Canvas();
  app.appendChild(canvasElement);
});