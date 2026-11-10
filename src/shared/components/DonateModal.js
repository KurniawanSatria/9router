"use client";

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import PropTypes from "prop-types";
import { GITHUB_CONFIG } from "@/shared/constants/config";
import Icon from "@/shared/components/Icon";

export default function DonateModal({ isOpen, onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const loading = !data && !error;
  const modalRef = useRef(null);

  useEffect(() => {
    if (!isOpen || data) return;
    fetch(GITHUB_CONFIG.donateUrl, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => {
        setError("");
        setData(json);
      })
      .catch((err) => setError(err.message || "Failed to load"));
  }, [isOpen, data]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) onClose();
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={modalRef}
        className="relative w-full bg-card-background border-[0.5px] border-card-border rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-w-3xl flex flex-col max-h-[85vh]"
      >
        <div className="flex items-center justify-between p-3 border-b border-card-border">
          <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
            <Icon name="volunteer_activism" className="text-pink-500" />
            {data?.title || "Support 9Router"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-secondary hover:bg-background-gray-primary transition-colors"
            aria-label="Close"
          >
            <Icon name="close" className="size-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {loading && (
            <div className="flex items-center justify-center py-10 text-text-secondary">
              <Icon name="progress_activity" className="animate-spin mr-2" />
              Loading...
            </div>
          )}
          {error && (
            <div className="text-error-500 py-4">Failed to load donate info: {error}</div>
          )}
          {!loading && !error && data && (
            <>
              {data.message && (
                <p className="text-text-secondary text-sm mb-6 text-center">{data.message}</p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {data.channels?.map((ch) => (
                  <DonateChannelCard key={ch.id} channel={ch} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function DonateChannelCard({ channel }) {
  const { label, description, icon, color, url, qr } = channel;
  const content = (
    <>
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
        style={{ backgroundColor: `${color}20`, color }}
      >
        <Icon name={icon} className="size-[26px]" />
      </div>
      <div className="font-semibold text-text-primary mb-1">{label}</div>
      {description && (
        <div className="text-xs text-text-secondary mb-3 text-center">{description}</div>
      )}
      {qr && (
        <img
          src={qr}
          alt={`${label} QR`}
          className="w-full max-w-[180px] aspect-square object-contain rounded-lg bg-white p-1"
        loading="lazy"
        decoding="async"
        />
      )}
    </>
  );

  return (
    <div className="flex flex-col items-center p-4 rounded-xl border-[0.5px] border-card-border bg-card-background hover:border-pink-500/40 transition-colors">
      {content}
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-white hover:opacity-90 transition-opacity"
          style={{ backgroundColor: color }}
        >
          Open
          <Icon name="open_in_new" className="size-4" />
        </a>
      )}
    </div>
  );
}

DonateModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};
