"use client";

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import PropTypes from "prop-types";
import { GITHUB_CONFIG } from "@/shared/constants/config";
import Icon from "@/shared/components/Icon";

export default function ChangelogModal({ isOpen, onClose }) {
  const [html, setHtml] = useState("");
  const [error, setError] = useState("");
  const loading = !html && !error;
  const modalRef = useRef(null);

  useEffect(() => {
    if (!isOpen || html) return;
    Promise.all([
      fetch(GITHUB_CONFIG.changelogUrl).then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      }),
      import("marked"),
    ])
      .then(([md, { marked }]) => {
        marked.setOptions({ gfm: true, breaks: true });
        setError("");
        setHtml(marked.parse(md));
      })
      .catch((err) => setError(err.message || "Failed to load"));
  }, [isOpen, html]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal content */}
      <div
        ref={modalRef}
        className="relative w-full bg-card-background border-[0.5px] border-card-border rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-w-3xl flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-card-border">
          <h2 className="text-base font-semibold text-text-primary">Change Log</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-secondary hover:bg-background-gray-primary transition-colors"
            aria-label="Close"
          >
            <Icon name="close" className="size-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading && (
            <div className="flex items-center justify-center py-10 text-text-secondary">
              <Icon name="progress_activity" className="animate-spin mr-2" />
              Loading...
            </div>
          )}
          {error && (
            <div className="text-error-500 py-4">Failed to load changelog: {error}</div>
          )}
          {!loading && !error && html && (
            <div
              className="changelog-body text-text-primary"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

ChangelogModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};
