// Formato mínimo para textos cortos (explicaciones de ejercicios): escapa el
// HTML y solo entiende **negrita**, *cursiva* y `código`, sin cruzar líneas.
const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function inlineMd(text: string): string {
  return text
    .replace(/[&<>"']/g, (c) => ESC[c])
    .replace(/`([^`\n]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
}
