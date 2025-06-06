// Canonical state and helpers for Visual Motion Studio V2

export const projectState = {
  media: [],
  timelines: [],
  activeTimelineId: null,
  // Add any other state properties your app uses here
};

export function getActiveTimeline() {
  return projectState.timelines.find(t => t.id === projectState.activeTimelineId);
}

export function addMedia(mediaObj) {
  projectState.media.push(mediaObj);
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

export const SECONDS_PER_PIXEL = 0.2; // Or the value you use elsewhere