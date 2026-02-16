"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface DialogOverlayProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

export function DialogOverlay({ open, onClose, children, className = "" }: DialogOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-dialog-fade-in ${className}`}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="animate-dialog-zoom-in">
        {children}
      </div>
    </div>
  );
}
