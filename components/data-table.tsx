"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  getCoreRowModel,
  useReactTable,
  flexRender,
  createColumnHelper
} from "@tanstack/react-table";

import { ConfirmDeleteDialog } from "@/components/delete-action";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDeleteAction } from "@/lib/use-delete-action";

export type DataColumn = {
  key: string;
  header: string;
  type?: "text" | "currency" | "badge" | "link" | "date" | "actions";
  hrefKey?: string;
};

export type RowActionsMeta = {
  moduleLabel: string;
  recordLabel: string;
  viewHref?: string;
  editHref?: string;
  deleteEndpoint?: string;
  deleteWarning?: string;
};

type DataTableProps<T extends Record<string, unknown>> = {
  columns: DataColumn[];
  data: T[];
  emptyLabel?: string;
};

type DeleteTarget = {
  moduleLabel: string;
  recordLabel: string;
  endpoint: string;
  warning?: string;
};

const columnHelper = createColumnHelper<Record<string, unknown>>();

function resolveBadgeVariant(value: string) {
  if (/(已生效|已收款|赢单|进行中|已验收)/.test(value)) {
    return "success";
  }

  if (/(审批中|待收|部分回款|立项中|需求发现|需求确认|方案设计|商务报价|商务谈判|跟进中|未开始)/.test(value)) {
    return "default";
  }

  if (/(延期|暂停|逾期)/.test(value)) {
    return "warning";
  }

  if (/(终止|丢单|已关闭|已取消)/.test(value)) {
    return "danger";
  }

  return "muted";
}

function RowActionsCell({
  actions,
  open,
  onToggle,
  onClose,
  onRequestDelete
}: {
  actions?: RowActionsMeta;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onRequestDelete: (target: DeleteTarget) => void;
}) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }

    function updatePosition() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }

      const menuWidth = 150;
      const viewportPadding = 12;
      const preferredLeft = rect.right - menuWidth;

      setPosition({
        top: rect.bottom + 8,
        left: Math.max(
          viewportPadding,
          Math.min(preferredLeft, window.innerWidth - menuWidth - viewportPadding)
        )
      });
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      const clickedTrigger = wrapperRef.current?.contains(target);
      const clickedMenu = menuRef.current?.contains(target);

      if (!clickedTrigger && !clickedMenu) {
        onClose();
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    updatePosition();
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [onClose, open]);

  if (!actions) {
    return "-";
  }

  return (
    <div ref={wrapperRef} className="relative flex justify-end">
      <button
        ref={triggerRef}
        type="button"
        onClick={onToggle}
        className="inline-flex cursor-pointer items-center gap-1 rounded-[8px] px-2 py-1 text-sm text-muted-foreground transition hover:bg-[var(--color-hover)] hover:text-foreground"
      >
        操作
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && position
        ? createPortal(
            <div
              ref={menuRef}
              className="surface-card-strong fixed z-[70] min-w-[150px] rounded-[12px] p-2 shadow-[var(--shadow-hover)]"
              style={{ top: position.top, left: position.left }}
            >
              {actions.viewHref ? (
                <Link
                  href={actions.viewHref}
                  className="block rounded-[10px] px-3 py-2 text-sm text-foreground transition hover:bg-[var(--color-hover)]"
                  onClick={onClose}
                >
                  查看
                </Link>
              ) : null}
              {actions.editHref ? (
                <Link
                  href={actions.editHref}
                  className="mt-1 block rounded-[10px] px-3 py-2 text-sm text-foreground transition hover:bg-[var(--color-hover)]"
                  onClick={onClose}
                >
                  编辑
                </Link>
              ) : null}
              {actions.deleteEndpoint ? (
                <button
                  type="button"
                  className="mt-1 flex w-full items-center gap-2 rounded-[10px] px-3 py-2 text-left text-sm text-[rgb(185,28,28)] transition hover:bg-[rgba(239,68,68,0.08)]"
                  onClick={() => {
                    onRequestDelete({
                      moduleLabel: actions.moduleLabel,
                      recordLabel: actions.recordLabel,
                      endpoint: actions.deleteEndpoint!,
                      warning: actions.deleteWarning
                    });
                    onClose();
                  }}
                >
                  删除
                </button>
              ) : null}
            </div>,
            document.body
          )
        : null}
    </div>
  );
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  emptyLabel = "暂无数据"
}: DataTableProps<T>) {
  const [openActionRowId, setOpenActionRowId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const { isDeleting, executeDelete } = useDeleteAction();
  const table = useReactTable({
    data,
    columns: columns.map((column) =>
      columnHelper.accessor(column.key, {
        header: column.header,
        cell: (context) => {
          const value = context.getValue();

          if (column.type === "badge") {
            const text = String(value ?? "-");
            return <Badge variant={resolveBadgeVariant(text)}>{text}</Badge>;
          }

          if (column.type === "link") {
            const href = context.row.original[column.hrefKey ?? `${column.key}Href`];
            return (
              <Link
                href={String(href)}
                className="font-medium text-[rgb(45,83,164)] underline-offset-4 transition hover:text-foreground hover:underline"
              >
                {String(value ?? "-")}
              </Link>
            );
          }

          if (column.type === "currency") {
            return `¥${Number(value ?? 0).toLocaleString("zh-CN", { minimumFractionDigits: 2 })}`;
          }

          return String(value ?? "-");
        }
      })
    ),
    getCoreRowModel: getCoreRowModel()
  });

  return (
    <div className="w-full overflow-x-auto">
      <Table className="min-w-full">
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {cell.column.id === "__actions" ? (
                      <RowActionsCell
                        actions={row.original.rowActions as RowActionsMeta | undefined}
                        open={openActionRowId === row.id}
                        onToggle={() =>
                          setOpenActionRowId((current) => (current === row.id ? null : row.id))
                        }
                        onClose={() => setOpenActionRowId((current) => (current === row.id ? null : current))}
                        onRequestDelete={setDeleteTarget}
                      />
                    ) : (
                      flexRender(cell.column.columnDef.cell, cell.getContext())
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                {emptyLabel}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <ConfirmDeleteDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
        moduleLabel={deleteTarget?.moduleLabel ?? "记录"}
        recordLabel={deleteTarget?.recordLabel ?? ""}
        warning={deleteTarget?.warning}
        isDeleting={isDeleting}
        onConfirm={async () => {
          if (!deleteTarget) {
            return;
          }

          const success = await executeDelete({
            endpoint: deleteTarget.endpoint,
            onSuccess: () => {
              setDeleteTarget(null);
              setOpenActionRowId(null);
            }
          });

          if (success) {
            setDeleteTarget(null);
          }
        }}
      />
    </div>
  );
}
