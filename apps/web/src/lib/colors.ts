const COLORS = [
  "#e11d48",
  "#d97706",
  "#059669",
  "#2563eb",
  "#7c3aed",
  "#db2777",
  "#0d9488",
  "#ea580c",
];

export function userColor(id: string): string {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return COLORS[hash % COLORS.length] ?? "#2563eb";
}
