"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState
} from "react";
import { CheckCircle2, AlertTriangle, XCircle, X } from "lucide-react";

import { cn } from "@/lib/utils";

type ToastTone = "success" | "error" | "warning";

type ToastItem = {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
};

type ToastContextValue = {
  pushToast: (toast: Omit<ToastItem, "id">) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const toneStyles: Record<
  ToastTone,
  { wrapper: string; icon: React.ComponentType<{ className?: string }> }
> = {
  success: {
    wrapper: "border-[rgba(16,185,129,0.18)] bg-[rgba(16,185,129,0.08)] text-[rgb(4,120,87)]",
    icon: CheckCircle2
  },
  error: {
    wrapper: "border-[rgba(239,68,68,0.18)] bg-[rgba(239,68,68,0.08)] text-[rgb(185,28,28)]",
    icon: XCircle
  },
  warning: {
    wrapper: "border-[rgba(245,158,11,0.18)] bg-[rgba(245,158,11,0.10)] text-[rgb(180,83,9)]",
    icon: AlertTriangle
  }
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const pushToast = useCallback((toast: Omit<ToastItem, "id">) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setItems((current) => [...current, { ...toast, id }]);

    window.setTimeout(() => {
      setItems((current) => current.filter((item) => item.id !== id));
    }, 3200);
  }, []);

  const value = useMemo(() => ({ pushToast }), [pushToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-5 top-5 z-[120] flex w-[min(92vw,360px)] flex-col gap-3">
        {items.map((item) => {
          const tone = toneStyles[item.tone];
          const Icon = tone.icon;

          return (
            <div
              key={item.id}
              className={cn(
                "pointer-events-auto surface-card-strong rounded-[14px] border px-4 py-3 shadow-[var(--shadow-hover)]",
                tone.wrapper
              )}
            >
              <div className="flex items-start gap-3">
                <Icon className="mt-0.5 h-5 w-5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{item.title}</div>
                  {item.description ? (
                    <div className="mt-1 text-sm text-foreground/80">{item.description}</div>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="rounded-full p-1 text-current/70 transition hover:bg-white/40 hover:text-current"
                  onClick={() => setItems((current) => current.filter((toast) => toast.id !== item.id))}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }

  return {
    success(title: string, description?: string) {
      context.pushToast({ title, description, tone: "success" });
    },
    error(title: string, description?: string) {
      context.pushToast({ title, description, tone: "error" });
    },
    warning(title: string, description?: string) {
      context.pushToast({ title, description, tone: "warning" });
    }
  };
}
