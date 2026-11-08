export default {
  id: "unorouter",
  priority: 121,
  alias: "unorouter",
  aliases: [
    "uno",
  ],
  uiAlias: "unorouter",
  display: {
    name: "UnoRouter",
    icon: "hub",
    color: "#FF2A0C",
    textIcon: "UN",
    website: "https://unorouter.com",
    notice: {
      text: "OpenAI-compatible aggregator. One API key reaches every model. Model ids are bare (e.g. claude-opus-5.5, gpt-6-astra) and are fetched live from the provider.",
      apiKeyUrl: "https://unorouter.com/dashboard",
    },
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    // OpenAI-compatible. `format` stays at the shared "openai" default and
    // `thinkingFormat` is deliberately NOT declared: UnoRouter forwards
    // requests verbatim, so each model resolves its own thinking wire format
    // through providers/capabilities.js.
    baseUrl: "https://api.unorouter.com/v1/chat/completions",
    validateUrl: "https://api.unorouter.com/v1/models",
    // Free keys allow 1 request/minute; retrying a 429 immediately only burns
    // the next window. Account fallback rotates to another key instead.
  },
  models: [],
  modelsFetcher: { url: "https://api.unorouter.com/v1/models", type: "openai" },
  passthroughModels: true,
};
