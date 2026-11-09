// Debug logging utility — only active in dev mode (NODE_ENV !== "production")
// Outputs are tagged with [DBG:tag] for easy grep/filter
const isDev = process.env.NODE_ENV !== "production";

function ts() {
  return new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function dbg(tag, msg) {
  if (!isDev) return;
  const dim = process.env.NO_COLOR ? "" : "\x1b[2m";
  const reset = process.env.NO_COLOR ? "" : "\x1b[0m";
  console.log(`${dim}[${ts()}] DEBUG [DBG:${tag}] ${msg}${reset}`);
}

export const isDebugEnabled = isDev;
