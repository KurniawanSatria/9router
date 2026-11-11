// Clef Flash — free public decision endpoint (https://clef-flash.com/api/decide).
// Unlike the Je v/Nace lanes, questions are an explicit array of
// { id, prompt, options } (1-8 entries), and the reply is an `answers` array with
// per-option probabilities. No API key: the endpoint counts 25 free requests/day.
export default {
  id: "clef",
  priority: 49,
  alias: "clef",
  uiAlias: "clef",
  display: {
    name: "Clef Flash",
    icon: "psychology",
    color: "#0E7490",
    textIcon: "CF",
    website: "https://clef-flash.com",
    notice: {
      text: "Free decision endpoint. Questions must be an array of { id, prompt, options } (1-8 entries); answers come back with calibrated probabilities. No API key — 25 free requests/day.",
    },
  },
  category: "free",
  noAuth: true,
  models: [
    { id: "clef-flash", name: "Clef Flash", kind: "systemone" },
  ],
  serviceKinds: ["systemone"],
  systemoneConfig: {
    baseUrl: "https://clef-flash.com/api/decide",
    path: "/api/decide",
    authType: "none",
    // Upstream refuses every model name it does not recognise (400 model_rejected)
    // and answers the default model when the field is absent.
    omitModel: true,
    probeBody: {
      state: "Customer: I was charged twice for my order this morning.",
      questions: [
        {
          id: "billing",
          prompt: "Is the customer reporting a billing problem?",
          options: ["yes", "no", "unknown"],
        },
      ],
    },
  },
};
