import { AntigravityExecutor } from "./antigravity.js";
import { GeminiCLIExecutor } from "./gemini-cli.js";
import { IFlowExecutor } from "./iflow.js";
import { KiroExecutor } from "./kiro.js";
import { KimchiExecutor } from "./kimchi.js";
import { OpenCodeExecutor } from "./opencode.js";
import { GrokWebExecutor } from "./grok-web.js";
import { PerplexityWebExecutor } from "./perplexity-web.js";
import { DeepSeekWebExecutor } from "./deepseek-web.js";
import { GeminiWebExecutor } from "./gemini-web.js";
import { MuseWebExecutor } from "./muse-web.js";
import { VeoAiFreeWebExecutor } from "./veoaifree-web.js";
import { UcWebExecutor } from "./uc-web.js";
import { ChatGptWebExecutor } from "./chatgpt-web.js";
import { XiaomiTokenplanExecutor } from "./xiaomi-tokenplan.js";
import { XiaomiMimoExecutor } from "./xiaomi-mimo.js";
import { MimoFreeExecutor } from "./mimo-free.js";
import { CodeBuddyIntlExecutor } from "./codebuddy-intl.js";
import TraeExecutor from "./trae.js";
import ZedExecutor from "./zed.js";
import WindsurfExecutor from "./windsurf.js";
import { DefaultExecutor } from "./default.js";
import { DevinCliExecutor } from "./devin-cli.js";

const executors = {
  antigravity: new AntigravityExecutor(),
  opencode: new OpenCodeExecutor(),
  "gemini-cli": new GeminiCLIExecutor(),
  iflow: new IFlowExecutor(),
  kiro: new KiroExecutor(),
  kimchi: new KimchiExecutor(),
  "grok-web": new GrokWebExecutor(),
  "perplexity-web": new PerplexityWebExecutor(),
  "deepseek-web": new DeepSeekWebExecutor(),
  "gemini-web": new GeminiWebExecutor(),
  "muse-web": new MuseWebExecutor(),
  "veoaifree-web": new VeoAiFreeWebExecutor(),
  "veo-free": new VeoAiFreeWebExecutor(), // Alias
  "uc-web": new UcWebExecutor(),
  "chatgpt-web": new ChatGptWebExecutor(),
  "xiaomi-tokenplan": new XiaomiTokenplanExecutor(),
  "xiaomi-mimo": new XiaomiMimoExecutor(),
  "mimo-free": new MimoFreeExecutor(),
  mmf: new MimoFreeExecutor(), // Alias for mimo-free
  trae: new TraeExecutor(),
  zed: new ZedExecutor(),
  windsurf: new WindsurfExecutor(),
  "devin-cli": new DevinCliExecutor(),
  // Second Bedrock entry for xAI's Grok, which speaks OpenAI Chat Completions rather than the
  // Anthropic Messages format. Same executor, different registry transport format — the pattern
  // vertex / vertex-partner already uses.
};

const defaultCache = new Map();

export function getExecutor(provider) {
  if (executors[provider]) return executors[provider];
  if (!defaultCache.has(provider)) defaultCache.set(provider, new DefaultExecutor(provider));
  return defaultCache.get(provider);
}

export function hasSpecializedExecutor(provider) {
  return !!executors[provider];
}

export { BaseExecutor } from "./base.js";
export { AntigravityExecutor } from "./antigravity.js";
export { GeminiCLIExecutor } from "./gemini-cli.js";
export { IFlowExecutor } from "./iflow.js";
export { KiroExecutor } from "./kiro.js";
export { KimchiExecutor } from "./kimchi.js";
export { DefaultExecutor } from "./default.js";
export { OpenCodeExecutor } from "./opencode.js";
export { GrokWebExecutor } from "./grok-web.js";
export { PerplexityWebExecutor } from "./perplexity-web.js";
export { DeepSeekWebExecutor } from "./deepseek-web.js";
export { GeminiWebExecutor } from "./gemini-web.js";
export { MuseWebExecutor } from "./muse-web.js";
export { ChatGptWebExecutor } from "./chatgpt-web.js";
export { XiaomiTokenplanExecutor } from "./xiaomi-tokenplan.js";
export { XiaomiMimoExecutor } from "./xiaomi-mimo.js";
export { MimoFreeExecutor } from "./mimo-free.js";
export { default as TraeExecutor } from "./trae.js";
export { default as ZedExecutor } from "./zed.js";
export { default as WindsurfExecutor } from "./windsurf.js";
