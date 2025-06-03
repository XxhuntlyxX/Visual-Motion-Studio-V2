export let projectState = {
  media: [],
  timelines: [],
  activeTimelineId: null
};
export let selectedFiles = [];
export const SECONDS_PER_PIXEL = 0.2;

export function setActiveTimelineId(id) {
  projectState.activeTimelineId = id;
}
export function getActiveTimeline() {
  return projectState.timelines.find(t => t.id === projectState.activeTimelineId);
}
export function addTimeline(timeline) {
  projectState.timelines.push(timeline);
  setActiveTimelineId(timeline.id);
}
export function addMedia(media) {
  projectState.media.push(media);
}
export function setSelectedFiles(files) {
  selectedFiles = files;
}
export function getSelectedFiles() {
  return selectedFiles;
}
export function clearSelectedFiles() {
  selectedFiles = [];
}
export function setProjectState(newState) {
  projectState = newState;
}