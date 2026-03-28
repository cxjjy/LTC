"use client";

import { useMemo } from "react";
import type { EChartsOption } from "echarts";

import { BaseEChart } from "@/components/charts/base-echart";

type ProjectStatusDatum = {
  status: string;
  count: number;
  percent: number;
  color?: string;
};

type ProjectStatusChartProps = {
  data: ProjectStatusDatum[];
};

export function ProjectStatusChart({ data }: ProjectStatusChartProps) {
  const empty = data.length === 0;
  const total = data.reduce((sum, item) => sum + item.count, 0);

  const option = useMemo<EChartsOption>(
    () => ({
      color: data.map((item) => item.color ?? "#3B82F6"),
      animationDuration: 260,
      animationDurationUpdate: 220,
      tooltip: {
        trigger: "item",
        backgroundColor: "rgba(17,24,39,0.92)",
        borderWidth: 0,
        textStyle: {
          color: "#F9FAFB",
          fontSize: 12
        },
        formatter: (params: any) =>
          `${params.marker}${params.name}<br/>数量：${params.value} 个<br/>占比：${params.percent}%`
      },
      legend: {
        bottom: 0,
        left: "center",
        icon: "circle",
        itemWidth: 10,
        itemHeight: 10,
        textStyle: {
          color: "#6B7280",
          fontSize: 12
        }
      },
      series: [
        {
          type: "pie",
          radius: ["58%", "78%"],
          center: ["50%", "44%"],
          avoidLabelOverlap: true,
          itemStyle: {
            borderColor: "#FFFFFF",
            borderWidth: 3
          },
          label: {
            show: true,
            color: "#6B7280",
            fontSize: 12,
            formatter: "{b}\n{d}%"
          },
          labelLine: {
            length: 10,
            length2: 8,
            lineStyle: {
              color: "#D1D5DB"
            }
          },
          emphasis: {
            scale: true,
            scaleSize: 4
          },
          data: data.map((item) => ({
            name: item.status,
            value: item.count,
            itemStyle: {
              color: item.color
            }
          }))
        }
      ],
      graphic: total
        ? [
            {
              type: "text",
              left: "center",
              top: "35%",
              style: {
                text: `${total}`,
                fill: "#111827",
                fontSize: 28,
                fontWeight: 600,
                textAlign: "center"
              }
            },
            {
              type: "text",
              left: "center",
              top: "48%",
              style: {
                text: "项目总数",
                fill: "#6B7280",
                fontSize: 12,
                textAlign: "center"
              }
            }
          ]
        : []
    }),
    [data, total]
  );

  return <BaseEChart option={option} height={280} empty={empty} emptyLabel="暂无项目状态分布数据" />;
}
