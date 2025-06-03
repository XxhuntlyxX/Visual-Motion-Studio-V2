import { initPixi } from './pixi-init.js';
import { setupMediaUpload, updateMediaList, updatePendingUploads, showPreviewForMedia } from './media.js';
import { updateTimelineList, updateTimelineSettings, updateTimeline, updateTimelineMeta, setupTrackPanelContextMenu, addMediaToTrack } from './timeline.js';
import { setupUI } from './ui.js';
import { setupControls, updatePlayhead } from './controls.js';
import { setupSaveLoad } from './save-load.js';

document.addEventListener('DOMContentLoaded', () => {
  initPixi();
  updateMediaList(showPreviewForMedia);
  updateTimelineList(updateTimelineSettings, updateTimeline, updateTimelineMeta);
  updateTimelineSettings();
  updateTimeline();
  updateTimelineMeta();
  updatePendingUploads();
  updatePlayhead();
  setupUI();
  setupMediaUpload(updatePendingUploads, updateMediaList, showPreviewForMedia);
  setupControls(showPreviewForMedia);
  setupTrackPanelContextMenu(updateTimeline);
  setupSaveLoad();
});