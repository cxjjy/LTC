"use client";

import { useMemo } from "react";
import type { EChartsOption } from "echarts";

import { BaseEChart } from "@/components/charts/base-echart";

type ProjectProfitDatum = {
  name: string;
  profit: number;
};

function shortName(value: string) {
  return value.length > 10 ? `${value.slice(0, 10)}…` : value;
}

function formatCurrency(value: number) {
  return `¥${value.toLocaleString("zh-CN")}`;
}

export function ProjectProfitChart({ data }: { data: ProjectProfitDatum[] }) {
  const option = useMemo<EChartsOption>(
    () => ({
      color: ["#3B82F6"],
      grid: { left: 14, right: 18, top: 20, bottom: 60, containLabel: true },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        backgroundColor: "rgba(17,24,39,0.92)",
        borderWidth: 0,
        textStyle: { color: "#F9FAFB", fontSize: 12 },
        formatter: (params: any) => {
          const item = Array.isArray(params) ? params[0] : params;
          return `${item.name}<br/>毛利：${formatCurrency(Number(item.value ?? 0))}`;
        }
      },
      xAxis: {
        type: "category",
        data: data.map((item) => shortName(item.name)),
        axisLabel: { color: "#6B7280", fontSize: 12, interval: 0, rotate: 20 },
        axisTick: { show: false },
        axisLine: { lineStyle: { color: "#E5E7EB" } }
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
          name: "项目毛利",
          type: "bar",
          barWidth: 22,
          itemStyle: {
            borderRadius: [8, 8, 0, 0]
          },
          data: data.map((item) => item.profit)
        }
      ]
    }),
    [data]
  );

  return <BaseEChart option={option} height={300} empty={!data.length} emptyLabel="暂无项目利润分布数据" />;
}
