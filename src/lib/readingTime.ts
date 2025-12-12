export function computeReadingStats(text: string) {
  const raw = text ?? "";

  const withoutCode = raw.replace(/```[\s\S]*?```/g, " ");
  const trimmed = withoutCode.trim();

  const words = trimmed ? trimmed.split(/\s+/).length : 0;
  const chars = raw.length;

  const WPM = 200; // средняя скорость чтения
  const minutes = words === 0 ? 0 : Math.max(1, Math.round(words / WPM));

  return { words, chars, minutes };
}
