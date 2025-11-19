// components/ui/Modal.tsx
"use client";

import { ReactNode, useEffect } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  // lock scroll body ketika modal terbuka
  useEffect(() => {
    if (typeof document === "undefined") return;

    const body = document.body;
    if (!body) return;

    if (open) {
      const prevOverflow = body.style.overflow;
      body.style.overflow = "hidden";

      // restore ketika modal ditutup / component unmount
      return () => {
        body.style.overflow = prevOverflow;
      };
    } else {
      body.style.overflow = "";
    }
  }, [open]);

  return (
    <div
      aria-hidden={!open}
      className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm ${
        open ? "modal-overlay-open" : "modal-overlay-closed"
      }`}
    >
      {/* backdrop klik untuk close */}
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />

      <div
        className={`relative w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900/95 p-5 shadow-2xl ${
          open ? "modal-dialog-open" : "modal-dialog-closed"
        }`}
      >
        {/* Tombol X */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 text-slate-500 hover:text-slate-200 text-xs"
        >
          ✕
        </button>

        {title && (
          <h2 className="mb-2 text-sm font-semibold text-slate-50">{title}</h2>
        )}

        <div className="text-xs text-slate-300">{children}</div>
      </div>
    </div>
  );
}
