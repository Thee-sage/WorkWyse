"use client";
import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { createPortal } from "react-dom";

// ─── Types ──────────────────────────────────────────────────────────
type ToastType = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
  count: number; // how many times this same message has fired in a row
}

interface ToastContextType {
  toast: {
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
  };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);
let nextId = 0;

/**
 * A stack cap and a duplicate window, together, so the app can never show
 * the wall of identical toasts a retrying or repeatedly-firing effect used
 * to produce: each new message either merges into a matching toast that's
 * still visible (bumping its count, "Failed to load companies ×4") or, once
 * the stack is at MAX_VISIBLE, is dropped rather than pushed in behind it.
 */
const MAX_VISIBLE = 3;
const DEDUPE_WINDOW_MS = 4000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  // Finding: avoid a hydration mismatch — `typeof window` is always true in
  // the browser (including the first client render pass during hydration),
  // while the server render always has no window. Gate the portal on a
  // state flag flipped in an effect instead, so the client's first render
  // matches the server's (neither renders the portal), and the portal only
  // mounts after hydration completes.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType) => {
    setToasts((prev) => {
      // Same type + message already on screen: bump its counter and reset
      // its own timer instead of adding a second, visually identical toast.
      const existingIndex = prev.findIndex((t) => t.message === message && t.type === type);
      if (existingIndex !== -1) {
        const next = [...prev];
        next[existingIndex] = { ...next[existingIndex], count: next[existingIndex].count + 1 };
        return next;
      }

      const id = nextId++;
      const created: Toast = { id, message, type, count: 1 };

      // At capacity: drop the oldest rather than let the stack grow
      // unbounded. Newest-first display below means this trims from the
      // visual bottom, not the top the user is looking at.
      const withNew = [...prev, created];
      return withNew.length > MAX_VISIBLE ? withNew.slice(withNew.length - MAX_VISIBLE) : withNew;
    });

    // Each call schedules a removal keyed on message+type rather than on a
    // specific toast id. Because addToast merges repeats above, a burst of
    // the same message effectively keeps pushing this removal back — the
    // toast only disappears once calls for it stop arriving for
    // DEDUPE_WINDOW_MS, instead of vanishing mid-burst while more of the
    // same error are still incoming.
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => !(t.message === message && t.type === type)));
    }, DEDUPE_WINDOW_MS);
  }, []);

  const toast = {
    success: (msg: string) => addToast(msg, "success"),
    error: (msg: string) => addToast(msg, "error"),
    info: (msg: string) => addToast(msg, "info"),
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {mounted &&
        createPortal(
          <div className="fixed top-5 right-5 z-[9999] flex flex-col-reverse gap-2 max-w-[380px] w-full pointer-events-none">
            {toasts.map((t) => (
              <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
            ))}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const toneClass =
    toast.type === "success"
      ? "bg-panel-teal-soft border-accent text-accent"
      : toast.type === "error"
      ? "bg-panel-destructive border-destructive text-destructive"
      : "bg-panel-amber border-amber text-amber-ink";

  return (
    <div
      onClick={onDismiss}
      className={`pointer-events-auto cursor-pointer border px-3.5 py-2.5 text-[13px] leading-[1.5] font-medium shadow-lg animate-[toastSlideIn_0.2s_ease-out] flex items-start gap-2 ${toneClass}`}
    >
      <span className="font-mono text-[11px] mt-[1px] shrink-0">
        {toast.type === "success" && "✓"}
        {toast.type === "error" && "✕"}
        {toast.type === "info" && "ℹ"}
      </span>
      <span className="flex-1">
        {toast.message}
        {toast.count > 1 && <span className="ml-1.5 font-mono text-[10.5px] opacity-70">×{toast.count}</span>}
      </span>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx.toast;
}
