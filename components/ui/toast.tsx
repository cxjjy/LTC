"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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

const TOAST_DURATION = 4200;

const toneStyles: Record<
  ToastTone,
  {
    wrapper: string;
    iconWrap: string;
    progress: string;
    eyebrow: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  success: {
    wrapper:
      "border-[rgba(15,23,42,0.08)] bg-[rgba(255,255,255,0.96)] text-[rgb(15,23,42)]",
    iconWrap: "bg-[rgba(34,197,94,0.10)] text-[rgb(21,128,61)]",
    progress: "bg-[rgb(34,197,94)]",
    eyebrow: "text-[rgb(21,128,61)]",
    icon: CheckCircle2
  },
  error: {
    wrapper:
      "border-[rgba(15,23,42,0.08)] bg-[rgba(255,255,255,0.96)] text-[rgb(15,23,42)]",
    iconWrap: "bg-[rgba(239,68,68,0.10)] text-[rgb(220,38,38)]",
    progress: "bg-[rgb(239,68,68)]",
    eyebrow: "text-[rgb(220,38,38)]",
    icon: XCircle
  },
  warning: {
    wrapper:
      "border-[rgba(15,23,42,0.08)] bg-[rgba(255,255,255,0.96)] text-[rgb(15,23,42)]",
    iconWrap: "bg-[rgba(245,158,11,0.11)] text-[rgb(217,119,6)]",
    progress: "bg-[rgb(245,158,11)]",
    eyebrow: "text-[rgb(217,119,6)]",
    icon: AlertTriangle
  }
};

const toneLabels: Record<ToastTone, string> = {
  success: "成功通知",
  error: "异常提醒",
  warning: "注意事项"
};

function ToastCard({
  item,
  onClose
}: {
  item: ToastItem;
  onClose: () => void;
}) {
  const tone = toneStyles[item.tone];
  const Icon = tone.icon;

  useEffect(() => {
    const timer = window.setTimeout(onClose, TOAST_DURATION);
    return () => window.clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={cn(
        "pointer-events-auto relative overflow-hidden rounded-[16px] border p-4 shadow-[0_12px_30px_rgba(15,23,42,0.10)] backdrop-blur-[10px] transition duration-300 animate-[toast-in_180ms_ease-out]",
        tone.wrapper
      )}
    >
      <div className={cn("absolute inset-x-0 top-0 h-[3px]", tone.progress)} />
      <div className="flex items-start gap-3">
        <div className={cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]", tone.iconWrap)}>
          <Icon className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className={cn("mb-1 text-[11px] font-semibold uppercase tracking-[0.08em]", tone.eyebrow)}>
            {toneLabels[item.tone]}
          </div>
          <div className="text-[14px] font-semibold leading-5 text-foreground">{item.title}</div>
          {item.description ? (
            <div className="mt-1 text-[13px] leading-5 text-foreground/68">{item.description}</div>
          ) : null}
        </div>
        <button
          type="button"
          className="rounded-[10px] p-1.5 text-foreground/38 transition hover:bg-[rgba(15,23,42,0.05)] hover:text-foreground/72"
          onClick={onClose}
          aria-label="关闭提示"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const pushToast = useCallback((toast: Omit<ToastItem, "id">) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setItems((current) => [...current, { ...toast, id }]);
  }, []);

  const value = useMemo(() => ({ pushToast }), [pushToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-5 top-5 z-[120] flex w-[min(92vw,380px)] flex-col gap-2.5">
        {items.map((item) => {
          return (
            <ToastCard
              key={item.id}
              item={item}
              onClose={() => setItems((current) => current.filter((toast) => toast.id !== item.id))}
            />
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
