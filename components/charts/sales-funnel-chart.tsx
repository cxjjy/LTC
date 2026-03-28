"use client";

import { useMemo } from "react";
import type { EChartsOption } from "echarts";

import { BaseEChart } from "@/components/charts/base-echart";

type FunnelStage = {
  label: string;
  count: number;
  conversionRate: number;
};

export function SalesFunnelChart({ data }: { data: FunnelStage[] }) {
  const option = useMemo<EChartsOption>(
    () => ({
      color: ["#3B82F6", "#60A5FA", "#93C5FD", "#BFDBFE"],
      tooltip: {
        trigger: "item",
        backgroundColor: "rgba(17,24,39,0.92)",
        borderWidth: 0,
        textStyle: { color: "#F9FAFB", fontSize: 12 },
        formatter: (params: any) => {
          const target = data.find((item) => item.label === params.name);
          return `${params.name}<br/>数量：${params.value}<br/>转化率：${target?.conversionRate ?? 100}%`;
        }
      },
      series: [
        {
          name: "销售漏斗",
          type: "funnel",
          left: "10%",
          top: 12,
          bottom: 12,
          width: "80%",
          min: 0,
          max: Math.max(...data.map((item) => item.count), 1),
          sort: "none",
          gap: 4,
          label: {
            show: true,
            color: "#111827",
            formatter: "{b}\n{c}"
          },
          labelLine: { show: false },
          itemStyle: {
            borderColor: "#FFFFFF",
            borderWidth: 2
          },
          data: data.map((item) => ({
            name: item.label,
            value: item.count
          }))
        }
      ]
    }),
    [data]
  );

  return <BaseEChart option={option} height={300} empty={!data.length} emptyLabel="暂无销售漏斗数据" />;
}
