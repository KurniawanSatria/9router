const MODEL_LABELS = { deepseek: "DeepSeek", glm: "GLM", gpt: "GPT", oss: "OSS", mimo: "MiMo", ai: "AI", llm: "LLM" };
const MODEL_SIZE = /^(?:\d+(?:\.\d+)?[bt]|a\d+b)$/i;

export function prettyModel(raw) {
  const id = String(raw || "").replace(/:free$/i, "").split("/").pop().trim();
  const words = id.split(/[-_]+/).filter((w) => w && !MODEL_SIZE.test(w));
  return words.map((w) => MODEL_LABELS[w.toLowerCase()] || w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}
