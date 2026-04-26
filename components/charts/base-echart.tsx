"use client";

import { useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import { BarChart, FunnelChart, LineChart, PieChart } from "echarts/charts";
import {
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { EChartsOption } from "echarts";

echarts.use([
  LineChart,
  BarChart,
  PieChart,
  FunnelChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  CanvasRenderer
]);

type BaseEChartProps = {
  option: EChartsOption;
  height?: number;
  empty?: boolean;
  emptyLabel?: string;
};

export function BaseEChart({
  option,
  height = 280,
  empty = false,
  emptyLabel = "暂无图表数据"
}: BaseEChartProps) {
  const chartRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!chartRef.current || empty) {
      return;
    }

    const chart = echarts.init(chartRef.current, undefined, {
      renderer: "canvas"
    });

    chart.setOption(option);

    const resizeObserver = new ResizeObserver(() => {
      chart.resize();
    });
    const handleResize = () => {
      chart.resize();
    };

    resizeObserver.observe(chartRef.current);
    window.addEventListener("resize", handleResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleResize);
      chart.dispose();
    };
  }, [empty, option]);

  if (empty) {
    return (
      <div
        className="flex items-center justify-center rounded-[12px] border border-dashed border-border bg-[var(--color-background)] text-sm text-muted-foreground"
        style={{ height }}
      >
        {emptyLabel}
      </div>
    );
  }

  return <div ref={chartRef} style={{ height, width: "100%" }} />;
}
