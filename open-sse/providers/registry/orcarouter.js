export default {
  id: "orcarouter",
  priority: 123,
  alias: "orcarouter",
  aliases: [
    "orca",
  ],
  uiAlias: "orcarouter",
  display: {
    name: "OrcaRouter",
    icon: "water",
    color: "#111827",
    textIcon: "OR",
    website: "https://www.orcarouter.ai",
    notice: {
      text: "OpenAI-compatible aggregator. One API key reaches every model. Model ids are bare (e.g. claude-opus-5.5, gpt-6-astra) and are fetched live from the provider.",
      apiKeyUrl: "https://www.orcarouter.ai/dashboard",
    },
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    // OpenAI-compatible. `format` stays at the shared "openai" default and
    // `thinkingFormat` is deliberately NOT declared: OrcaRouter forwards
    // requests verbatim, so each model resolves its own thinking wire format
    // through providers/capabilities.js.
    baseUrl: "https://www.orcarouter.ai/v1/chat/completions",
    validateUrl: "https://www.orcarouter.ai/v1/models",
    // OrcaRouter allows 1 request/minute per key. Never retry a 429 in-process
    // (the default retry config already skips 429); let account fallback lock
    // the key instead of firing two more doomed requests at the same window.
  },
  models: [],
  modelsFetcher: { url: "https://www.orcarouter.ai/v1/models", type: "openai" },
  passthroughModels: true,
};
