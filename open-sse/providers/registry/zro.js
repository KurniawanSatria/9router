export default {
  id: "zro",
  priority: 122,
  alias: "zro",
  aliases: [
    "moonmath",
  ],
  uiAlias: "zro",
  display: {
    name: "Zro Moonmath",
    icon: "dark_mode",
    color: "#000000",
    textIcon: "ZR",
    website: "https://zro.moonmath.ai",
    notice: {
      text: "OpenAI-compatible aggregator. One API key reaches every model. Model ids are bare (e.g. claude-opus-5.5, gpt-6-astra) and are fetched live from the provider.",
      apiKeyUrl: "https://zro.moonmath.ai/dashboard",
    },
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    // OpenAI-compatible. `format` stays at the shared "openai" default and
    // `thinkingFormat` is deliberately NOT declared: Zro forwards requests
    // verbatim, so each model resolves its own thinking wire format through
    // providers/capabilities.js.
    baseUrl: "https://zro.moonmath.ai/v1/chat/completions",
    validateUrl: "https://zro.moonmath.ai/v1/models",
    retry: {
      429: 2,
    },
  },
  models: [],
  modelsFetcher: { url: "https://zro.moonmath.ai/v1/models", type: "openai" },
  passthroughModels: true,
};
