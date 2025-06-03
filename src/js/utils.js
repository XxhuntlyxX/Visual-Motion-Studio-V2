export function formatTime(secs) {
  const m = Math.floor(secs / 60);
  const s = Math.round(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
export function getMediaType(file) {
  if (file.type) {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'audio';
  }
  const ext = file.name.split('.').pop().toLowerCase();
  if (['jpg','jpeg','png','gif','bmp','webp'].includes(ext)) return 'image';
  if (['mp4','mov','avi','webm'].includes(ext)) return 'video';
  if (['mp3','wav','ogg'].includes(ext)) return 'audio';
  return 'other';
}