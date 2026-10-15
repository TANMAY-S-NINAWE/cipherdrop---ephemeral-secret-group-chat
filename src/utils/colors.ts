export interface ChatColorOption {
  name: string;
  hex: string;
}

export const PRESET_CHAT_COLORS: ChatColorOption[] = [
  { name: 'Emerald', hex: '#10b981' },
  { name: 'Cyan', hex: '#06b6d4' },
  { name: 'Sky', hex: '#0284c7' },
  { name: 'Violet', hex: '#8b5cf6' },
  { name: 'Rose', hex: '#f43f5e' },
  { name: 'Amber', hex: '#d97706' },
  { name: 'Teal', hex: '#0d9488' },
  { name: 'Fuchsia', hex: '#d946ef' },
  { name: 'Indigo', hex: '#6366f1' },
  { name: 'Lime', hex: '#65a30d' },
];

export function getContrastTextColor(hexColor: string): '#000000' | '#ffffff' {
  // Strip # if present
  const hex = hexColor.replace('#', '');
  if (hex.length !== 6) return '#ffffff';

  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Perceived luminance formula (ITU-R BT.709)
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#ffffff';
}
