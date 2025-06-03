export function setupUI() {
  document.getElementById('create-timeline-btn').onclick = () => {
    document.getElementById('timeline-modal').style.display = 'block';
  };
  document.getElementById('close-timeline-modal').onclick = () => {
    document.getElementById('timeline-modal').style.display = 'none';
  };
}