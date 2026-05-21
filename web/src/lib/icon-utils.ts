import { getClassWithColor } from "file-icons-js";

const iconCache = new Map<string, { content: string, fontFamily: string, color: string }>();
let helperEl: HTMLElement | null = null;

export function getIconInfo(fileName: string) {
  if (typeof window === "undefined") return null;
  const className = getClassWithColor(fileName);
  if (!className) return null;
  
  if (iconCache.has(className)) {
    return iconCache.get(className);
  }

  if (!helperEl) {
    helperEl = document.createElement("i");
    helperEl.style.position = "absolute";
    helperEl.style.left = "-9999px";
    document.body.appendChild(helperEl);
  }

  helperEl.className = className;
  // We need to wait for styles to apply, but getComputedStyle is synchronous.
  // However, fonts might take a moment to load. We can assume the CSS is loaded if we imported it in layout.
  const computed = window.getComputedStyle(helperEl, '::before');
  const content = computed.content?.replace(/['"]/g, '');
  const fontFamily = computed.fontFamily;
  // Get color from the element itself since file-icons applies color to :before using inherit or directly
  const color = computed.color;

  if (content && content !== 'none') {
    const info = { content, fontFamily, color };
    iconCache.set(className, info);
    return info;
  }
  return null;
}