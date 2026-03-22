"use client";

import Link from "next/link";
import {
  getCoreRowModel,
  useReactTable,
  flexRender,
  createColumnHelper
} from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type DataColumn = {
  key: string;
  header: string;
  type?: "text" | "currency" | "badge" | "link" | "date";
  hrefKey?: string;
};

type DataTableProps<T extends Record<string, unknown>> = {
  columns: DataColumn[];
  data: T[];
  emptyLabel?: string;
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

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  emptyLabel = "暂无数据"
}: DataTableProps<T>) {
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
    <div className="overflow-x-auto">
      <Table>
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
                  <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
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
    </div>
  );
}
