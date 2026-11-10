"use client";

import { useState, useEffect } from "react";
import { getDefaultPricing, formatCost } from "open-sse/providers/pricing.js";
import Icon from "@/shared/components/Icon";

export default function PricingModal({ isOpen, onClose, onSave }) {
  const [pricingData, setPricingData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadPricing();
    }
  }, [isOpen]);

  const loadPricing = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/pricing");
      if (response.ok) {
        const data = await response.json();
        setPricingData(data);
      } else {
        // Fallback to defaults
        const defaults = getDefaultPricing();
        setPricingData(defaults);
      }
    } catch (error) {
      console.error("Failed to load pricing:", error);
      const defaults = getDefaultPricing();
      setPricingData(defaults);
    } finally {
      setLoading(false);
    }
  };

  const handlePricingChange = (provider, model, field, value) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0) return;

    setPricingData(prev => {
      const newData = { ...prev };
      if (!newData[provider]) newData[provider] = {};
      if (!newData[provider][model]) newData[provider][model] = {};
      newData[provider][model][field] = numValue;
      return newData;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/pricing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pricingData)
      });

      if (response.ok) {
        onSave?.();
        onClose();
      } else {
        const error = await response.json();
        alert(`Failed to save pricing: ${error.error}`);
      }
    } catch (error) {
      console.error("Failed to save pricing:", error);
      alert("Failed to save pricing");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm("Reset all pricing to defaults? This cannot be undone.")) return;

    try {
      const response = await fetch("/api/pricing", { method: "DELETE" });
      if (response.ok) {
        const defaults = getDefaultPricing();
        setPricingData(defaults);
      }
    } catch (error) {
      console.error("Failed to reset pricing:", error);
      alert("Failed to reset pricing");
    }
  };

  if (!isOpen) return null;

  // Get all unique providers and models for display
  const allProviders = Object.keys(pricingData).sort();
  const pricingFields = ["input", "output", "cached", "reasoning", "cache_creation"];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card-background border-[0.5px] border-card-border rounded-xl shadow-[var(--shadow-elev)] max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-card-border flex items-center justify-between">
          <h2 className="text-base font-semibold text-text-primary">Pricing Configuration</h2>
          <button
            onClick={onClose}
            className="inline-flex size-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-background-gray-primary hover:text-text-primary"
          >
            <Icon name="close" className="size-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-5">
          {loading ? (
            <div className="text-center py-8 text-text-secondary">Loading pricing data...</div>
          ) : (
            <div className="space-y-5">
              {/* Instructions */}
              <div className="rounded-xl border-[0.5px] border-card-border bg-background-gray-primary p-3 text-sm">
                <p className="text-sm font-semibold text-text-primary mb-1">Pricing Rates Format</p>
                <p className="text-sm text-text-secondary">
                  All rates are in <strong>dollars per million tokens</strong> ($/1M tokens).
                  Example: Input rate of 2.50 means $2.50 per 1,000,000 input tokens.
                </p>
              </div>

              {/* Pricing Tables */}
              {allProviders.map(provider => {
                const models = Object.keys(pricingData[provider]).sort();
                return (
                  <div key={provider} className="rounded-xl border-[0.5px] border-card-border overflow-hidden">
                    <div className="bg-background-gray-primary px-4 py-2 text-xs font-semibold uppercase text-text-tertiary">
                      {provider.toUpperCase()}
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-background-100 text-text-tertiary uppercase text-xs">
                          <tr>
                            <th className="px-4 py-3 text-left">Model</th>
                            <th className="px-4 py-3 text-right">Input</th>
                            <th className="px-4 py-3 text-right">Output</th>
                            <th className="px-4 py-3 text-right">Cached</th>
                            <th className="px-4 py-3 text-right">Reasoning</th>
                            <th className="px-4 py-3 text-right">Cache Creation</th>
                          </tr>
                        </thead>
                        <tbody>
                          {models.map((model, i) => (
                            <tr key={model} className={`border-b border-card-border hover:bg-background-gray-primary transition-colors ${i === models.length - 1 ? "last:border-0" : ""}`}>
                              <td className="px-4 py-3 font-medium text-text-primary">{model}</td>
                              {pricingFields.map(field => (
                                <td key={field} className="px-4 py-3">
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={pricingData[provider][model][field] || 0}
                                    onChange={(e) => handlePricingChange(provider, model, field, e.target.value)}
                                    className="w-20 px-2 py-1 text-right bg-card-background border border-input-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary-500"
                                  />
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}

              {allProviders.length === 0 && (
                <div className="text-center py-8 text-text-secondary">
                  No pricing data available
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-card-border flex items-center justify-between gap-2">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm text-error-500 hover:bg-error-500/10 rounded-lg border border-error-500/20 transition-colors"
            disabled={saving}
          >
            Reset to Defaults
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary border border-card-border rounded-lg transition-colors"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm bg-primary-500 text-primary-text rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}