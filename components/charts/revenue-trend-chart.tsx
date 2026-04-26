"use client";

import { useMemo } from "react";
import type { EChartsOption } from "echarts";

import { BaseEChart } from "@/components/charts/base-echart";

type RevenueTrendPoint = {
  month: string;
  contractAmount: number;
  receivedAmount: number;
};

type RevenueTrendChartProps = {
  data: RevenueTrendPoint[];
};

function formatCurrency(value: number) {
  return `¥${value.toLocaleString("zh-CN")}`;
}

export function RevenueTrendChart({ data }: RevenueTrendChartProps) {
  const empty = data.length === 0;

  const option = useMemo<EChartsOption>(
    () => ({
      color: ["#3B82F6", "#10B981"],
      animationDuration: 280,
      animationDurationUpdate: 220,
      grid: {
        left: 12,
        right: 18,
        top: 44,
        bottom: 18,
        containLabel: true
      },
      legend: {
        top: 0,
        left: 0,
        icon: "circle",
        itemWidth: 10,
        itemHeight: 10,
        textStyle: {
          color: "#6B7280",
          fontSize: 12
        }
      },
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(17,24,39,0.92)",
        borderWidth: 0,
        textStyle: {
          color: "#F9FAFB",
          fontSize: 12
        },
        axisPointer: {
          type: "line",
          lineStyle: {
            color: "rgba(59,130,246,0.22)"
          }
        },
        formatter: (params: any) => {
          const items = Array.isArray(params) ? params : [params];
          const lines = items.map(
            (item: any) =>
              `${item.marker}${item.seriesName}：${formatCurrency(Number(item.value ?? 0))}`
          );
          return [items[0]?.axisValueLabel ?? "", ...lines].join("<br/>");
        }
      },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: data.map((item) => item.month),
        axisLine: {
          lineStyle: {
            color: "#E5E7EB"
          }
        },
        axisTick: {
          show: false
        },
        axisLabel: {
          color: "#6B7280",
          fontSize: 12
        }
      },
      yAxis: {
        type: "value",
        splitNumber: 4,
        axisLine: {
          show: false
        },
        axisTick: {
          show: false
        },
        splitLine: {
          lineStyle: {
            color: "#EEF2F7"
          }
        },
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
          smooth: 0.24,
          symbol: "circle",
          symbolSize: 7,
          lineStyle: {
            width: 3
          },
          itemStyle: {
            borderWidth: 2,
            borderColor: "#FFFFFF"
          },
          data: data.map((item) => item.contractAmount)
        },
        {
          name: "回款金额",
          type: "line",
          smooth: 0.24,
          symbol: "circle",
          symbolSize: 7,
          lineStyle: {
            width: 3
          },
          itemStyle: {
            borderWidth: 2,
            borderColor: "#FFFFFF"
          },
          data: data.map((item) => item.receivedAmount)
        }
      ]
    }),
    [data]
  );

  return <BaseEChart option={option} height={280} empty={empty} emptyLabel="暂无收入与回款趋势数据" />;
}
