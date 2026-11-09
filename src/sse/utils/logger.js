// Logger utility for cloud

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

const LEVEL = LOG_LEVELS[process.env.LOG_LEVEL?.toUpperCase?.()] ?? LOG_LEVELS.INFO;

function formatTime() {
  return new Date().toLocaleTimeString("en-US", { hour12: false });
}

// Short hex tags to correlate request lines by session (same session → same tag)
let tagCursor = 0;

function toTag(n) {
  return (n >>> 0).toString(16).padStart(4, "0").slice(0, 4);
}

// Allocate next rotating tag (fallback when no session seed available)
export function nextTag() {
  return toTag(tagCursor++);
}

// Stable tag derived from a session/connection seed: same seed always maps to the same tag
export function tagForSession(seed) {
  if (!seed) return nextTag();
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return toTag(h);
}

const RESET = "\x1b[0m";
const COLORS = {
  DEBUG: "\x1b[2m",
  INFO: "",
  WARN: "\x1b[33m",
  ERROR: "\x1b[31m",
  HTTP: "\x1b[36m",
  DONE: "\x1b[32m",
};

const COLORS_ENABLED = !process.env.NO_COLOR;

function paint(color, text) {
  return color && COLORS_ENABLED ? `${color}${text}${RESET}` : text;
}

// Print one correlated line: [time] tag symbol message
export function line(tag, symbol, message) {
  if (LEVEL > LOG_LEVELS.INFO) return;
  const color = symbol === "📊" ? COLORS.DONE : symbol === "✗" ? COLORS.ERROR : symbol === "▶" ? COLORS.HTTP : COLORS.INFO;
  console.log(paint(color, `[${formatTime()}] ${tag} ${symbol} ${message}`));
}

// Like line() but always printed regardless of LOG_LEVEL (errors must never be hidden)
export function errorLine(tag, symbol, message) {
  console.log(paint(COLORS.ERROR, `[${formatTime()}] ${tag} ${symbol} ${message}`));
}

// Format thinking intent for the request line ("high(10k)" / "off" / "auto")
export function fmtThink(intent) {
  if (!intent || !intent.mode) return null;
  if (intent.mode === "none") return "off";
  if (intent.mode === "auto") return "auto";
  if (intent.mode === "budget") {
    const k = intent.budget >= 1000 ? `${Math.round(intent.budget / 1000)}k` : `${intent.budget}`;
    return k;
  }
  if (intent.mode === "level") return intent.level;
  return null;
}

function formatData(data) {
  if (!data) return "";
  if (typeof data === "string") return data;
  try {
    return JSON.stringify(data);
  } catch {
    return String(data);
  }
}

export function debug(tag, message, data) {
  if (LEVEL <= LOG_LEVELS.DEBUG) {
    const dataStr = data ? ` ${formatData(data)}` : "";
    console.log(paint(COLORS.DEBUG, `[${formatTime()}] DEBUG [${tag}] ${message}${dataStr}`));
  }
}

export function info(tag, message, data) {
  if (LEVEL <= LOG_LEVELS.INFO) {
    const dataStr = data ? ` ${formatData(data)}` : "";
    console.log(`[${formatTime()}] INFO  [${tag}] ${message}${dataStr}`);
  }
}

export function warn(tag, message, data) {
  if (LEVEL <= LOG_LEVELS.WARN) {
    const dataStr = data ? ` ${formatData(data)}` : "";
    console.warn(paint(COLORS.WARN, `[${formatTime()}] WARN  [${tag}] ${message}${dataStr}`));
  }
}

export function error(tag, message, data) {
  if (LEVEL <= LOG_LEVELS.ERROR) {
    const dataStr = data ? ` ${formatData(data)}` : "";
    console.log(paint(COLORS.ERROR, `[${formatTime()}] ERROR [${tag}] ${message}${dataStr}`));
  }
}

export function request(method, path, extra) {
  const dataStr = extra ? ` ${formatData(extra)}` : "";
  console.log(paint(COLORS.HTTP, `[${formatTime()}] HTTP  → ${method} ${path}${dataStr}`));
}

export function response(status, duration, extra) {
  const dataStr = extra ? ` ${formatData(extra)}` : "";
  const color = status < 400 ? COLORS.HTTP : COLORS.ERROR;
  console.log(paint(color, `[${formatTime()}] HTTP  ← ${status} ${duration}ms${dataStr}`));
}

export function stream(event, data) {
  const dataStr = data ? ` ${formatData(data)}` : "";
  console.log(`[${formatTime()}] INFO  [STREAM] ${event}${dataStr}`);
}

// Mask sensitive data
export function maskKey(key) {
  if (!key || key.length < 8) return "***";
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}
