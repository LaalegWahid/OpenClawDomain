export const mono = "var(--mono), 'JetBrains Mono', monospace";
export const ACCENT = "#FF4D00";

// Slightly longer than the server-side gateway timeout (120s in docker.ts) so
// that the server normally resolves its own timeout first and returns a
// friendly bubble. Last-resort safety net in case the route handler hangs.
export const CLIENT_TIMEOUT_MS = 150_000;

// Textarea autogrow bounds. fontSize 13 + lineHeight 18 → one row = 18px.
// Grows freely from 1 row up to 10 rows (180 + 20 padding = 200), then scrolls.
export const TEXTAREA_LINE_HEIGHT = 18;
export const TEXTAREA_MAX_ROWS = 10;
export const TEXTAREA_VERTICAL_PADDING = 20;
export const TEXTAREA_MAX_HEIGHT =
  TEXTAREA_LINE_HEIGHT * TEXTAREA_MAX_ROWS + TEXTAREA_VERTICAL_PADDING;
