import { getActiveTimeline, SECONDS_PER_PIXEL } from './state.js';

export let playInterval = null;
export let playhead = 0;

export function updatePlayhead() {
  const tracksCol = document.getElementById('timeline-tracks-col');
  const playheadDiv = document.getElementById('timeline-playhead');
  if (tracksCol && playheadDiv) {
    playheadDiv.style.left = (window.playhead || 0) / SECONDS_PER_PIXEL + 'px';
    playheadDiv.style.height = tracksCol.offsetHeight + 'px';
  }
}
export function setupControls(showPreviewForClip) {
  document.getElementById('play-btn').onclick = () => {
    if (playInterval) return;
    const t = getActiveTimeline();
    if (!t) return;
    let maxEnd = 0;
    t.tracks.forEach(track => {
      track.items.forEach(clip => {
        maxEnd = Math.max(maxEnd, clip.start + clip.duration);
      });
    });
    playInterval = setInterval(() => {
      updatePlayhead();
      let found = false;
      t.tracks.forEach(track => {
        for (const clip of track.items) {
          if (playhead >= clip.start && playhead < clip.start + clip.duration) {
            found = true;
            showPreviewForClip(clip);
            break;
          }
        }
      });
      playhead += 1 / (t.fps||30);
      if (playhead > maxEnd) document.getElementById('stop-btn').onclick();
    }, 1000 / (t.fps || 30));
  };
  document.getElementById('pause-btn').onclick = () => {
    clearInterval(playInterval);
    playInterval = null;
  };
  document.getElementById('stop-btn').onclick = () => {
    clearInterval(playInterval);
    playInterval = null;
    playhead = 0;
    window.playhead = 0;
    updatePlayhead();
  };
}