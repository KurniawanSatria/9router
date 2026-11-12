"use client";

import PropTypes from "prop-types";
import { resolveModelIcon } from "@/shared/utils/modelBrand";
import Icon from "@/shared/components/Icon";

/**
 * ModelIcon — the leading icon for a model row.
 *
 * Resolution order:
 *   1. test status (ok / error) — live state always wins
 *   2. brand icon: colour art when the brand has it, otherwise a mono
 *      silhouette masked over currentColor so it follows the theme
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

  const brand = resolveModelIcon(modelId);

  if (brand?.color) {
    return (
      <img
        src={brand.url}
        alt=""
        title={brand.label}
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

  if (brand) {
    return (
      <span
        role="img"
        aria-label={brand.label}
        title={brand.label}
        className={`inline-block shrink-0 bg-current ${className}`}
        style={{
          width: size,
          height: size,
          WebkitMaskImage: `url("${brand.url}")`,
          maskImage: `url("${brand.url}")`,
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
