// BeatAPI — one key for two surfaces: an OpenAI-compatible text catalogue
// (direct.beatapi.io, with api.beatapi.io as fallback) and the Decisions /
// System One endpoint on api.beatapi.io. The decision models (`jev-1.14`,
// `jev-1.13`) are NOT available on /v1/chat/completions, and the old
// `jev-*-free` ids were retired on 2026-11-05.
// Docs: https://docs.beatapi.io/decisions · https://docs.beatapi.io/text-api
export default {
  id: "beatapi",
  priority: 95,
  alias: "beatapi",
  aliases: ["beatapi"],
  uiAlias: "beatapi",
  display: {
    name: "BeatAPI",
    icon: "graphic_eq",
    color: "#F97316",
    textIcon: "BE",
    website: "https://beatapi.io",
    notice: {
      text: "One key, two surfaces: OpenAI-compatible text models on direct.beatapi.io (api.beatapi.io as fallback) plus the Decisions / System One endpoint on api.beatapi.io. Decision models are jev-1.14 and jev-1.13 — they are not served on /v1/chat/completions, and the retired jev-*-free ids no longer resolve.",
      apiKeyUrl: "https://beatapi.io/dashboard/keys",
    },
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    // Text lane: OpenAI-compatible, so `format` stays at the shared "openai"
    // default. Both hosts are listed because the docs recommend direct for text
    // while api.beatapi.io is the documented fallback.
    baseUrls: [
      "https://direct.beatapi.io/v1/chat/completions",
      "https://api.beatapi.io/v1/chat/completions",
    ],
    validateUrl: "https://api.beatapi.io/v1/models",
    // Free keys allow 1 request/minute; do not retry a 429 in-process.
  },
  // Decision models ride the System One lane; the text catalogue is fetched live
  // and any other id is accepted through passthroughModels.
  models: [
    { id: "jev-1.14", name: "JEV 1.14", kind: "systemone" },
    { id: "jev-1.13", name: "JEV 1.13", kind: "systemone" },
  ],
  serviceKinds: ["llm", "systemone"],
  systemoneConfig: {
    baseUrl: "https://api.beatapi.io/v1/systemone",
    // A saved host (providerSpecificData.baseUrl) is joined with this path.
    path: "/v1/systemone",
    authType: "apikey",
    authHeader: "bearer",
  },
  modelsFetcher: { url: "https://api.beatapi.io/v1/models", type: "openai" },
  passthroughModels: true,
};
