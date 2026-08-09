"use client";
import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { createPortal } from "react-dom";

// ─── Types ──────────────────────────────────────────────────────────
type ToastType = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
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

// ─── Provider ───────────────────────────────────────────────────────
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    success: (msg: string) => addToast(msg, "success"),
    error: (msg: string) => addToast(msg, "error"),
    info: (msg: string) => addToast(msg, "info"),
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {typeof window !== "undefined" &&
        createPortal(
          <div
            style={{
              position: "fixed",
              top: "1.25rem",
              right: "1.25rem",
              zIndex: 9999,
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
              maxWidth: "380px",
              width: "100%",
              pointerEvents: "none",
            }}
          >
            {toasts.map((t) => (
              <div
                key={t.id}
                onClick={() => dismiss(t.id)}
                style={{
                  pointerEvents: "auto",
                  cursor: "pointer",
                  padding: "0.75rem 1rem",
                  borderRadius: "0.5rem",
                  fontSize: "0.85rem",
                  lineHeight: 1.5,
                  fontWeight: 500,
                  boxShadow: "0 4px 16px -4px rgba(0,0,0,0.12)",
                  animation: "toastSlideIn 0.25s ease-out",
                  border: "1px solid",
                  ...(t.type === "success"
                    ? { backgroundColor: "#f0fdf4", color: "#166534", borderColor: "#bbf7d0" }
                    : t.type === "error"
                    ? { backgroundColor: "#fef2f2", color: "#991b1b", borderColor: "#fecaca" }
                    : { backgroundColor: "#eff6ff", color: "#1e40af", borderColor: "#bfdbfe" }),
                }}
              >
                {t.type === "success" && "✓ "}
                {t.type === "error" && "✕ "}
                {t.type === "info" && "ℹ "}
                {t.message}
              </div>
            ))}
          </div>,
          document.body
        )}
      <style jsx global>{`
        @keyframes toastSlideIn {
          from {
            opacity: 0;
            transform: translateX(24px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx.toast;
}
