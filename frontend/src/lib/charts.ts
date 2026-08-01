import type { EChartsOption } from "echarts";
import { getT } from "./i18n";

export const ACCENT = "#eeb74f";
export const ACCENT2 = "#4ec3a3";
export const TERRACOTTA = "#ef9460";
export const CORAL = "#ef6f5f";

const TOOLTIP = {
  backgroundColor: "#211b11",
  borderColor: "rgba(226,199,150,0.22)",
  textStyle: { color: "#f4edde" },
};

const AXIS = {
  axisLine: { lineStyle: { color: "rgba(226,199,150,0.22)" } },
  axisLabel: { color: "#a19077", fontSize: 11 },
  splitLine: { lineStyle: { color: "rgba(226,199,150,0.09)" } },
};

export function barRanking(
  wilayas: { wilaya: string; value: number; rang: number }[],
  color: string
): EChartsOption {
  return {
    tooltip: { trigger: "axis", ...TOOLTIP },
    grid: { left: 8, right: 16, top: 8, bottom: 8, containLabel: true },
    xAxis: {
      type: "value",
      ...AXIS,
      axisLabel: { ...AXIS.axisLabel, formatter: "{value}" },
    },
    yAxis: { type: "category", inverse: true, ...AXIS },
    series: [
      {
        type: "bar",
        data: wilayas.map((w) => ({
          value: w.value,
          itemStyle: {
            color: w.rang <= 3 ? color : "rgba(238,183,79,0.28)",
            borderRadius: [0, 6, 6, 0],
          },
        })),
        barWidth: 16,
        label: { show: true, position: "right", color: "#f4edde", fontSize: 11, fontWeight: 600 },
      },
    ],
  };
}

export function donut(
  data: { name: string; value: number; color: string }[],
  centerLabel: string,
  centerValue: string
): EChartsOption {
  return {
    tooltip: {
      trigger: "item",
      ...TOOLTIP,
      formatter: "{b} : {c} ({d}%)",
    },
    series: [
      {
        type: "pie",
        radius: ["62%", "85%"],
        center: ["50%", "50%"],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 6, borderColor: "#15110a", borderWidth: 3 },
        label: { show: false },
        emphasis: { label: { show: true, color: "#f4edde", fontSize: 13, fontWeight: 700 } },
        data,
      },
    ],
    graphic: [
      {
        type: "text",
        left: "center",
        top: "41%",
        style: { text: centerLabel, fill: "#a19077", fontSize: 11, fontWeight: 600, align: "center" },
      },
      {
        type: "text",
        left: "center",
        top: "51%",
        style: { text: centerValue, fill: "#f4edde", fontSize: 22, fontWeight: 700, align: "center", fontFamily: "Fraunces" },
      },
    ],
  };
}

export function radar(
  indicators: { name: string; max: number }[],
  values: number[],
  color: string
): EChartsOption {
  return {
    tooltip: TOOLTIP,
    radar: {
      indicator: indicators.map((i) => ({ name: i.name, max: i.max })),
      radius: "68%",
      axisName: { color: "#a19077", fontSize: 11 },
      splitLine: { lineStyle: { color: "rgba(226,199,150,0.15)" } },
      splitArea: { areaStyle: { color: ["rgba(238,183,79,0.03)", "rgba(238,183,79,0.06)"] } },
      axisLine: { lineStyle: { color: "rgba(226,199,150,0.22)" } },
    },
    series: [
      {
        type: "radar",
        data: [{ value: values, name: getT()("charts.wilaya") }],
        symbol: "circle",
        symbolSize: 5,
        lineStyle: { color, width: 2 },
        itemStyle: { color },
        areaStyle: { color: "rgba(238,183,79,0.16)" },
      },
    ],
  };
}

export function lineChart(
  series: { name: string; color: string; data: { year: number; value: number }[] }[]
): EChartsOption {
  return {
    tooltip: { trigger: "axis", ...TOOLTIP },
    legend: { textStyle: { color: "#a19077", fontSize: 11 }, top: 0 },
    grid: { left: 8, right: 8, top: 32, bottom: 8, containLabel: true },
    xAxis: { type: "category", ...AXIS },
    yAxis: { type: "value", ...AXIS },
    series: series.map((s) => ({
      name: s.name,
      type: "line",
      smooth: true,
      symbol: "circle",
      symbolSize: 5,
      lineStyle: { width: 2.5, color: s.color },
      itemStyle: { color: s.color },
      areaStyle: { opacity: 0.06, color: s.color },
      data: s.data.map((d) => d.value),
    })),
  };
}

export function forceGraph(
  nodes: { id: string; value: number; category: number; label: string }[],
  links: { source: string; target: string; weight: number }[],
  categories: { name: string }[]
): EChartsOption {
  return {
    tooltip: TOOLTIP,
    series: [
      {
        type: "graph",
        layout: "force",
        roam: true,
        draggable: true,
        categories,
        force: { repulsion: 420, edgeLength: [60, 140], gravity: 0.12 },
        label: { show: true, position: "right", color: "#d8cbb0", fontSize: 11, fontWeight: 600 },
        lineStyle: { color: "source", opacity: 0.5, width: 1.2, curveness: 0.08 },
        emphasis: { focus: "adjacency", lineStyle: { width: 4, opacity: 0.9 } },
        data: nodes.map((n) => ({
          name: n.label,
          value: n.value,
          category: n.category,
          symbolSize: 18 + n.value * 3,
          itemStyle: { borderColor: "#15110a", borderWidth: 2 },
        })),
        links: links.map((l) => ({ source: l.source, target: l.target, value: l.weight })),
      },
    ],
  };
}
