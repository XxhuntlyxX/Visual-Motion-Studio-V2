// Canonical state and helpers for Visual Motion Studio V2

export const projectState = {
  media: [],
  timelines: [],
  activeTimelineId: null,
  // For file selection in media uploads
  selectedFiles: []
};

export function getActiveTimeline() {
  return projectState.timelines.find(t => t.id === projectState.activeTimelineId);
}

export function addMedia(mediaObj) {
  projectState.media.push(mediaObj);
}

export function setProjectState(newState) {
  Object.assign(projectState, newState);
}

export function getSelectedFiles() {
  return projectState.selectedFiles || [];
}

export function setSelectedFiles(files) {
  projectState.selectedFiles = files;
}

export function clearSelectedFiles() {
  projectState.selectedFiles = [];
}

export const SECONDS_PER_PIXEL = 0.2; // Adjust as needed for your timeline scaling