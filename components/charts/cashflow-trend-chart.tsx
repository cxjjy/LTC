"use client";

import { useMemo } from "react";
import type { EChartsOption } from "echarts";

import { BaseEChart } from "@/components/charts/base-echart";

type CashflowPoint = {
  month: string;
  dueAmount: number;
  receivedAmount: number;
};

function formatCurrency(value: number) {
  return `¥${value.toLocaleString("zh-CN")}`;
}

export function CashflowTrendChart({ data }: { data: CashflowPoint[] }) {
  const option = useMemo<EChartsOption>(
    () => ({
      color: ["#94A3B8", "#10B981"],
      legend: {
        top: 0,
        left: 0,
        icon: "circle",
        itemWidth: 10,
        itemHeight: 10,
        textStyle: { color: "#6B7280", fontSize: 12 }
      },
      grid: { left: 14, right: 18, top: 44, bottom: 18, containLabel: true },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        backgroundColor: "rgba(17,24,39,0.92)",
        borderWidth: 0,
        textStyle: { color: "#F9FAFB", fontSize: 12 },
        formatter: (params: any) => {
          const target = data.find((item) => item.month === params[0]?.axisValueLabel);
          const rows = (Array.isArray(params) ? params : [params]).map(
            (item: any) => `${item.marker}${item.seriesName}：${formatCurrency(Number(item.value ?? 0))}`
          );
          const monthCollectionRate =
            target && target.dueAmount > 0 ? `${((target.receivedAmount / target.dueAmount) * 100).toFixed(1)}%` : "100.0%";
          return [params[0]?.axisValueLabel ?? "", ...rows, `当月回笼率：${monthCollectionRate}`].join("<br/>");
        }
      },
      xAxis: {
        type: "category",
        data: data.map((item) => item.month),
        axisTick: { show: false },
        axisLine: { lineStyle: { color: "#E5E7EB" } },
        axisLabel: { color: "#6B7280", fontSize: 12 }
      },
      yAxis: {
        type: "value",
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: "#EEF2F7" } },
        axisLabel: {
          color: "#6B7280",
          fontSize: 12,
          formatter: (value: number) => formatCurrency(value)
        }
      },
      series: [
        {
          name: "应收金额",
          type: "bar",
          barMaxWidth: 20,
          itemStyle: { borderRadius: [6, 6, 0, 0] },
          data: data.map((item) => item.dueAmount)
        },
        {
          name: "实收金额",
          type: "bar",
          barMaxWidth: 20,
          itemStyle: { borderRadius: [6, 6, 0, 0] },
          data: data.map((item) => item.receivedAmount)
        }
      ]
    }),
    [data]
  );

  return <BaseEChart option={option} height={300} empty={!data.length} emptyLabel="暂无现金流趋势数据" />;
}
