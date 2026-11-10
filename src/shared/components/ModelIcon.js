"use client";

import PropTypes from "prop-types";
import { getBrandIconUrl, resolveModelBrand } from "@/shared/utils/modelBrand";
import Icon from "@/shared/components/Icon";

const BRAND_LABELS = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  "google-gemini": "Google Gemini",
  deepseek: "DeepSeek",
  "xai-grok": "xAI Grok",
  moonshot: "Moonshot AI",
  zhipu: "Zhipu GLM",
  mistral: "Mistral",
  minimax: "MiniMax",
  stepfun: "StepFun",
  xiaomi: "Xiaomi",
  "alibaba-cloud": "Alibaba Qwen",
  meta: "Meta Llama",
  nvidia: "NVIDIA",
  cerebras: "Cerebras",
  cohere: "Cohere",
  openrouter: "OpenRouter",
};

/**
 * Some CDN icons are a plain white silhouette (fill="#fff"), which is
 * invisible on the light theme. Those are painted as a CSS mask in the
 * brand's own colour instead of being loaded as an <img>.
 *
 * A value of null means the brand genuinely has no colour of its own
 * (OpenAI and xAI are monochrome marks), so it inherits the text colour.
 */
const MASK_BRANDS = {
  anthropic: "#D97757", // Anthropic terracotta
  nvidia: "#76B900",    // NVIDIA green
  openai: null,         // monochrome mark
  "xai-grok": null,     // monochrome mark
};

/**
 * ModelIcon — the leading icon for a model row.
 *
 * Resolution order:
 *   1. test status (ok / error) — live state always wins
 *   2. brand icon in the brand's own colour
 *   3. generic bot glyph — ONLY for models we cannot attribute to a brand
 */
export default function ModelIcon({ modelId, testStatus, size = 16, className = "" }) {
  const statusColor =
    testStatus === "ok" ? "#22c55e" : testStatus === "error" ? "#ef4444" : undefined;

  if (testStatus === "ok" || testStatus === "error") {
    return (
      <Icon name={testStatus === "ok" ? "check_circle" : "cancel"} className={` shrink-0 ${className}`} style={{ color: statusColor, fontSize: size }} aria-hidden="true" />
    );
  }

  const slug = resolveModelBrand(modelId);
  const url = slug ? getBrandIconUrl(modelId) : null;

  if (url) {
    const label = BRAND_LABELS[slug] || slug;

    // White-only icons: paint as a mask so the brand colour shows through.
    if (slug in MASK_BRANDS) {
      const brandColor = MASK_BRANDS[slug];
      return (
        <span
          role="img"
          aria-label={label}
          title={label}
          className={`inline-block shrink-0 ${brandColor ? "" : "bg-current"} ${className}`}
          style={{
            width: size,
            height: size,
            backgroundColor: brandColor || undefined,
            WebkitMaskImage: `url("${url}")`,
            maskImage: `url("${url}")`,
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
            WebkitMaskPosition: "center",
            maskPosition: "center",
            WebkitMaskSize: "contain",
            maskSize: "contain",
          }}
        />
      );
    }

    // Already full-colour icons: show them as they are.
    return (
      <img
        src={url}
        alt=""
        title={label}
        width={size}
        height={size}
        className={`shrink-0 object-contain ${className}`}
        style={{ width: size, height: size }}
        loading="lazy"
        decoding="async"
        aria-hidden="true"
      />
    );
  }

  return (
    <Icon name="smart_toy" className={` shrink-0 text-text-tertiary ${className}`} style={{ fontSize: size }} title="Unknown model" aria-hidden="true" />
  );
}

ModelIcon.propTypes = {
  modelId: PropTypes.string,
  testStatus: PropTypes.oneOf(["ok", "error"]),
  size: PropTypes.number,
  className: PropTypes.string,
};
