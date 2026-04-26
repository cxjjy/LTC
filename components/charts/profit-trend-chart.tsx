"use client";

import { useMemo } from "react";
import type { EChartsOption } from "echarts";

import { BaseEChart } from "@/components/charts/base-echart";

type ProfitTrendPoint = {
  month: string;
  contractAmount: number;
  costAmount: number;
  profitAmount: number;
  profitMargin: number;
};

function formatCurrency(value: number) {
  return `¥${value.toLocaleString("zh-CN")}`;
}

export function ProfitTrendChart({ data }: { data: ProfitTrendPoint[] }) {
  const option = useMemo<EChartsOption>(
    () => ({
      color: ["#3B82F6", "#F59E0B", "#10B981"],
      grid: { left: 14, right: 18, top: 44, bottom: 18, containLabel: true },
      legend: {
        top: 0,
        left: 0,
        icon: "circle",
        itemWidth: 10,
        itemHeight: 10,
        textStyle: { color: "#6B7280", fontSize: 12 }
      },
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(17,24,39,0.92)",
        borderWidth: 0,
        textStyle: { color: "#F9FAFB", fontSize: 12 },
        formatter: (params: any) => {
          const target = data.find((item) => item.month === params[0]?.axisValueLabel);
          const rows = (Array.isArray(params) ? params : [params]).map(
            (item: any) => `${item.marker}${item.seriesName}：${formatCurrency(Number(item.value ?? 0))}`
          );
          const marginRow = `毛利率：${target?.profitMargin?.toFixed(1) ?? "0.0"}%`;
          const signalRow =
            (target?.profitAmount ?? 0) < 0 ? '<span style="color:#FCA5A5">当月亏损，需关注成本与签约质量</span>' : "利润结构正常";
          return [params[0]?.axisValueLabel ?? "", ...rows, marginRow, signalRow].join("<br/>");
        }
      },
      xAxis: {
        type: "category",
        data: data.map((item) => item.month),
        boundaryGap: false,
        axisLine: { lineStyle: { color: "#E5E7EB" } },
        axisTick: { show: false },
        axisLabel: { color: "#6B7280", fontSize: 12 }
      },
      yAxis: {
        type: "value",
        splitLine: { lineStyle: { color: "#EEF2F7" } },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: "#6B7280",
          fontSize: 12,
          formatter: (value: number) => formatCurrency(value)
        }
      },
      series: [
        {
          name: "合同金额",
          type: "line",
          smooth: 0.22,
          symbol: "circle",
          symbolSize: 6,
          lineStyle: { width: 3 },
          data: data.map((item) => item.contractAmount)
        },
        {
          name: "成本",
          type: "line",
          smooth: 0.22,
          symbol: "circle",
          symbolSize: 6,
          lineStyle: { width: 3 },
          data: data.map((item) => item.costAmount)
        },
        {
          name: "毛利",
          type: "line",
          smooth: 0.22,
          symbol: "circle",
          symbolSize: 6,
          lineStyle: { width: 3 },
          data: data.map((item) => ({
            value: item.profitAmount,
            itemStyle: {
              color: item.profitAmount < 0 ? "#EF4444" : "#10B981"
            }
          })),
          markLine: {
            silent: true,
            symbol: "none",
            lineStyle: {
              color: "#FCA5A5",
              type: "dashed"
            },
            data: [{ yAxis: 0 }]
          }
        }
      ]
    }),
    [data]
  );

  return <BaseEChart option={option} height={300} empty={!data.length} emptyLabel="暂无利润趋势数据" />;
}
