const CDN = "https://cdn.jsdelivr.net/gh/glincker/thesvg@v0.6.0/public/icons";

const FAMILIES = [
  ["anthropic", /claude|fable|opus|sonnet|haiku/i],
  ["openai", /gpt-|chatgpt/i],
  ["google-gemini", /gemini/i],
  ["deepseek", /deepseek/i],
  ["xai-grok", /grok/i],
  ["moonshot", /kimi|moonshot/i],
  ["zhipu", /glm|zhipu|chatglm/i],
  ["mistral", /mistral|mixtral|codestral|magistral|devstral/i],
  ["minimax", /minimax/i],
  ["xiaomi-mimo", /mimo|xiaomi/i],
  ["alibaba-cloud", /qwen|qwq|alibaba/i],
  ["meta", /llama/i],
  ["nvidia", /nemotron|nvidia/i],
  ["cerebras", /cerebras/i],
  ["cohere", /command|cohere/i],
  ["openrouter", /openrouter/i],
];

export function resolveModelBrand(modelId) {
  const id = String(modelId || "");
  if (!id) return null;
  for (const [slug, pattern] of FAMILIES) {
    if (pattern.test(id)) return slug;
  }
  return null;
}

/**
 * Brand icon URL.
 *
 * The CDN ships two variants per brand and neither is theme-safe as an <img>:
 *   - `mono` has no fill attribute, so it renders black (invisible on dark),
 *     and it simply does not exist for several brands (openai, deepseek,
 *     xai-grok return 404)
 *   - several `default` icons are hard-coded white (invisible on light)
 * So we always resolve to `default`, which exists for every brand, and let
 * ModelIcon paint it as a CSS mask over currentColor. A mask only reads the
 * alpha channel, so the baked-in fill colour stops mattering.
 */
export function getBrandIconUrl(modelId, variant = "default") {
  const slug = resolveModelBrand(modelId);
  if (!slug) return null;
  return `${CDN}/${slug}/${variant}.svg`;
}
