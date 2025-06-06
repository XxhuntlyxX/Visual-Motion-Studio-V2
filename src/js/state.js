// Canonical project state and helper accessors

export const projectState = {
  media: [],
  timelines: [],
  activeTimelineId: null,
  // ... any other state properties you use
};

export function getActiveTimeline() {
  return projectState.timelines.find(t => t.id === projectState.activeTimelineId);
}

// Add any other exports needed by other modules here
export const SECONDS_PER_PIXEL = 0.2; // or whatever value you use