"use client";

import { useEffect, useId, useRef } from "react";
import { cn } from "@/shared/utils/cn";
import Button from "./Button";
import Icon from "@/shared/components/Icon";

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = "md",
  closeOnOverlay = true,
  className,
}) {
  const titleId = useId();
  const panelRef = useRef(null);
  const sizes = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    full: "max-w-4xl",
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement;
    const panel = panelRef.current;
    const target = panel?.querySelector("button") || panel;
    target?.focus();
    return () => previouslyFocused?.focus?.();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm fade-in"
        onClick={closeOnOverlay ? onClose : undefined}
      />

      {/* Modal content */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className={cn(
          "relative w-full bg-card-background",
          "border-[0.5px] border-card-border",
          "rounded-xl shadow-[var(--shadow-elev)]",
          "fade-in",
          sizes[size],
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 p-5 border-b border-card-border">
          {title ? (
            <h2 id={titleId} className="text-base font-semibold text-text-primary">{title}</h2>
          ) : <span />}
          <button
            onClick={onClose}
            aria-label="Close"
            title="Close"
            className="inline-flex size-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-background-gray-primary hover:text-text-primary"
          >
            <Icon name="close" className="size-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 max-h-[calc(85vh-100px)] overflow-y-auto custom-scrollbar">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-card-border">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm",
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
  loading = false,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            {cancelText}
          </Button>
          <Button variant={variant} onClick={onConfirm} loading={loading}>
            {confirmText}
          </Button>
        </>
      }
    >
      <p className="text-sm text-text-secondary">{message}</p>
    </Modal>
  );
}
