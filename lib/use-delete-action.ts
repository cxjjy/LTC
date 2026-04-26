"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useToast } from "@/components/ui/toast";

type DeleteRequest = {
  endpoint: string;
  redirectTo?: string;
  onSuccess?: () => void;
};

export function useDeleteAction() {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  const toast = useToast();

  function buildRedirectUrl(path: string) {
    const url = new URL(path, window.location.origin);
    url.searchParams.set("_refresh", String(Date.now()));
    return `${url.pathname}${url.search}`;
  }

  async function executeDelete({ endpoint, redirectTo, onSuccess }: DeleteRequest) {
    try {
      setIsDeleting(true);
      const response = await fetch(endpoint, {
        method: "DELETE"
      });
      const payload = (await response.json()) as { success: boolean; error?: string };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "删除失败");
      }

      toast.success("删除成功", "记录已移入隐藏状态");
      onSuccess?.();

      if (redirectTo) {
        window.location.replace(buildRedirectUrl(redirectTo));
      } else {
        router.refresh();
      }
      return true;
    } catch (error) {
      toast.error("删除失败", error instanceof Error ? error.message : "当前记录无法删除");
      return false;
    } finally {
      setIsDeleting(false);
    }
  }

  return {
    isDeleting,
    executeDelete
  };
}
