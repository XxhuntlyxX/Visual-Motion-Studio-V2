import { projectState, setProjectState } from './state.js';
import { updateMediaList, showPreviewForMedia } from './media.js';
import { updateTimelineList, updateTimelineSettings, updateTimelineMeta, updateTimeline } from './timeline.js';

export function setupSaveLoad() {
  document.getElementById('save-btn').addEventListener('click', function () {
    const dataStr = JSON.stringify(projectState);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "my_project.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
  document.getElementById('load-project-file').addEventListener('change', function(event) {
    if (event.target.files.length > 0) {
      const file = event.target.files[0];
      const reader = new FileReader();
      reader.onload = function (e) {
        try {
          const loadedState = JSON.parse(e.target.result);
          if (loadedState && Array.isArray(loadedState.media)) {
            setProjectState(loadedState);
            updateMediaList(showPreviewForMedia);
            updateTimelineList(updateTimelineSettings, updateTimeline, updateTimelineMeta);
            updateTimelineSettings();
            updateTimeline();
            updateTimelineMeta();
          } else {
            alert("Invalid project file.");
          }
        } catch (err) {
          alert("Failed to load project file.");
        }
      };
      reader.readAsText(file);
    }
  });
}