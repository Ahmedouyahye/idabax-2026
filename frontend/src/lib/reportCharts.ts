import type { EChartsOption } from "echarts";
import { getT } from "./i18n";

export const PAPER = {
  ink: "#221b12",
  muted: "#6b5b3f",
  gold: "#b96a1f",
  amber: "#e88f3a",
  teal: "#1f7a63",
  tealSoft: "#4aa385",
  red: "#a3402f",
  hairline: "rgba(21,17,10,0.18)",
  grid: "rgba(21,17,10,0.08)",
};

const fr = (v: number) => Math.round(v).toLocaleString("fr-FR");

function tooltip() {
  return {
    backgroundColor: "#f7f1e3",
    borderColor: PAPER.hairline,
    textStyle: { color: PAPER.ink, fontSize: 12 },
    extraCssText: "box-shadow: 0 4px 16px rgba(21,17,10,0.18); border-radius: 8px;",
  };
}

const axis = (secondary: boolean) => ({
  axisLine: { lineStyle: { color: secondary ? "rgba(21,17,10,0.12)" : PAPER.hairline } },
  axisLabel: { color: PAPER.muted, fontSize: 10 },
  splitLine: { lineStyle: { color: PAPER.grid } },
  axisTick: { show: false },
});

export function reportDonut(
  data: { name: string; value: number; color: string }[],
  centerLabel: string,
  centerValue: string
): EChartsOption {
  return {
    animation: false,
    tooltip: {
      trigger: "item",
      ...tooltip(),
      formatter: (p: any) => getT()("charts.enfants", { b: p.name, c: p.value, d: p.percent }),
    },
    legend: {
      bottom: 0,
      icon: "circle",
      itemWidth: 9,
      itemHeight: 9,
      itemGap: 14,
      textStyle: { color: PAPER.muted, fontSize: 11 },
    },
    series: [
      {
        type: "pie",
        radius: ["52%", "76%"],
        center: ["50%", "42%"],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 6, borderColor: "#f7f1e3", borderWidth: 3 },
        label: { show: false },
        data,
      },
    ],
    graphic: [
      {
        type: "text",
        left: "center",
        top: "34%",
        style: { text: centerLabel, fill: PAPER.muted, fontSize: 11, fontWeight: 600, align: "center" },
      },
      {
        type: "text",
        left: "center",
        top: "46%",
        style: {
          text: centerValue,
          fill: PAPER.ink,
          fontSize: 24,
          fontWeight: 800,
          align: "center",
          fontFamily: "Fraunces, Georgia, serif",
        },
      },
    ],
  };
}

export function reportBars(
  categories: string[],
  values: { value: number; color: string }[],
  markLineValue: number | null
): EChartsOption {
  return {
    animation: false,
    tooltip: {
      trigger: "axis",
      ...tooltip(),
      formatter: (ps: any) => getT()("charts.taux_pct", { name: ps[0].name, v: ps[0].value.toFixed(1) }),
    },
    grid: { left: 6, right: 14, top: 14, bottom: 6, containLabel: true },
    xAxis: { type: "category", data: categories, ...axis(false) },
    yAxis: {
      type: "value",
      ...axis(false),
      axisLabel: { color: PAPER.muted, fontSize: 10, formatter: "{value} %" },
      max: 55,
    },
    series: [
      {
        type: "bar",
        barWidth: 30,
        data: values.map((v) => ({
          value: v.value,
          itemStyle: { color: v.color, borderRadius: [5, 5, 0, 0] },
        })),
        label: {
          show: true,
          position: "top",
          color: PAPER.ink,
          fontSize: 11,
          fontWeight: 700,
          formatter: (p: any) => `${p.value.toFixed(1)} %`,
        },
        markLine: markLineValue
          ? {
              symbol: "none",
              silent: true,
              lineStyle: { type: "dashed", color: PAPER.red, width: 1.4 },
              label: {
                formatter: getT()("charts.national", { v: markLineValue.toFixed(1) }),
                color: PAPER.red,
                fontSize: 10,
                fontWeight: 700,
                position: "insideEndTop",
              },
              data: [{ yAxis: markLineValue }],
            }
          : undefined,
      },
    ],
  };
}

export function reportHbar(items: { label: string; value: number; top?: boolean }[], max: number): EChartsOption {
  return {
    animation: false,
    tooltip: {
      trigger: "axis",
      ...tooltip(),
      formatter: (ps: any) => getT()("charts.ipe_value", { name: ps[0].name, v: ps[0].value.toFixed(1) }),
    },
    grid: { left: 8, right: 42, top: 6, bottom: 6, containLabel: true },
    xAxis: { type: "value", max, ...axis(false), axisLabel: { color: PAPER.muted, fontSize: 10 } },
    yAxis: { type: "category", inverse: true, ...axis(false), axisLabel: { color: PAPER.ink, fontSize: 11, fontWeight: 600 } },
    series: [
      {
        type: "bar",
        barWidth: 15,
        data: items.map((it) => ({
          value: it.value,
          itemStyle: {
            color: it.top ? PAPER.gold : "rgba(185,106,31,0.25)",
            borderRadius: [0, 4, 4, 0],
          },
        })),
        label: {
          show: true,
          position: "right",
          color: PAPER.ink,
          fontSize: 10,
          fontWeight: 700,
        },
      },
    ],
  };
}

export function reportLorenz(lorenz: { x: number; y: number }[], gini: number): EChartsOption {
  const eq = [{ x: 0, y: 0 }, { x: 100, y: 100 }];
  return {
    animation: false,
    tooltip: {
      trigger: "axis",
      ...tooltip(),
      formatter: (ps: any) =>
        `${getT()("charts.lorenz_x", { v: ps[0].axisValue })}<br/>${getT()("charts.lorenz_y", { v: ps[0].value })}`,
    },
    legend: {
      bottom: 0,
      icon: "rect",
      itemWidth: 12,
      itemHeight: 2,
      itemGap: 14,
      textStyle: { color: PAPER.muted, fontSize: 11 },
      data: [getT()("charts.lorenz"), getT()("charts.equity")],
    },
    grid: { left: 8, right: 16, top: 10, bottom: 24, containLabel: true },
    xAxis: {
      type: "value",
      name: getT()("charts.wilayas_cum"),
      nameTextStyle: { color: PAPER.muted, fontSize: 10 },
      min: 0,
      max: 100,
      ...axis(false),
      axisLabel: { color: PAPER.muted, fontSize: 10, formatter: "{value}" },
    },
    yAxis: {
      type: "value",
      name: getT()("charts.hors_ecole_cum"),
      nameTextStyle: { color: PAPER.muted, fontSize: 10 },
      min: 0,
      max: 100,
      ...axis(false),
      axisLabel: { color: PAPER.muted, fontSize: 10, formatter: "{value}" },
    },
    series: [
      {
        name: getT()("charts.lorenz"),
        type: "line",
        smooth: true,
        symbol: "none",
        lineStyle: { color: PAPER.teal, width: 2.4 },
        areaStyle: { color: "rgba(31,122,99,0.12)" },
        data: lorenz.map((p) => [p.x, p.y]),
      },
      {
        name: getT()("charts.equity"),
        type: "line",
        symbol: "none",
        lineStyle: { type: "dashed", color: PAPER.hairline, width: 1.4 },
        data: eq.map((p) => [p.x, p.y]),
      },
    ],
    graphic: [
      {
        type: "text",
        left: "6%",
        top: "10%",
        style: {
          text: getT()("charts.gini", { v: gini.toFixed(2) }),
          fill: PAPER.gold,
          fontSize: 13,
          fontWeight: 800,
          fontFamily: "Fraunces, Georgia, serif",
        },
      },
    ],
  };
}

export function reportScenarios(
  items: { label: string; value: number; color: string }[],
  base2022: number
): EChartsOption {
  return {
    animation: false,
    tooltip: {
      trigger: "axis",
      ...tooltip(),
      formatter: (ps: any) => `${ps[0].name}<br/>${getT()("charts.n_enfants", { v: fr(ps[0].value) })}`,
    },
    grid: { left: 8, right: 14, top: 14, bottom: 6, containLabel: true },
    xAxis: { type: "category", ...axis(false), axisLabel: { color: PAPER.ink, fontSize: 11, fontWeight: 600 } },
    yAxis: {
      type: "value",
      ...axis(false),
      axisLabel: { color: PAPER.muted, fontSize: 10, formatter: (v: number) => `${fr(v / 1000)} k` },
    },
    series: [
      {
        type: "bar",
        barWidth: 44,
        data: items.map((it) => ({
          value: it.value,
          itemStyle: { color: it.color, borderRadius: [5, 5, 0, 0] },
        })),
        label: {
          show: true,
          position: "top",
          color: PAPER.ink,
          fontSize: 11,
          fontWeight: 800,
          formatter: (p: any) => fr(p.value),
        },
        markLine: {
          symbol: "none",
          silent: true,
          lineStyle: { type: "dashed", color: PAPER.red, width: 1.4 },
          label: { formatter: getT()("charts.annee_2022", { v: fr(base2022) }), color: PAPER.red, fontSize: 10, fontWeight: 700, position: "insideEndTop" },
          data: [{ yAxis: base2022 }],
        },
      },
    ],
  };
}

export function reportScatter(
  points: { name: string; value: [number, number]; size: number; color: string }[],
  medianVolume: number,
  medianIntensite: number
): EChartsOption {
  return {
    animation: false,
    tooltip: {
      trigger: "item",
      ...tooltip(),
      formatter: (p: any) => `${p.name}<br/>${getT()("charts.taux_colon", { v: p.value[1].toFixed(1) })}`,
    },
    grid: { left: 8, right: 12, top: 12, bottom: 6, containLabel: true },
    xAxis: {
      type: "value",
      name: getT()("charts.volume"),
      nameTextStyle: { color: PAPER.muted, fontSize: 10 },
      ...axis(false),
      axisLabel: { color: PAPER.muted, fontSize: 10 },
    },
    yAxis: {
      type: "value",
      name: getT()("charts.intensite"),
      nameTextStyle: { color: PAPER.muted, fontSize: 10 },
      ...axis(false),
      axisLabel: { color: PAPER.muted, fontSize: 10, formatter: "{value} %" },
    },
    series: [
      {
        type: "scatter",
        data: points.map((p) => ({
          name: p.name,
          value: p.value,
          symbolSize: Math.max(9, Math.min(30, p.size)),
          itemStyle: { color: p.color, opacity: 0.85, borderColor: "#f7f1e3", borderWidth: 1 },
          label: { show: true, position: "top", color: PAPER.ink, fontSize: 9, fontWeight: 700 },
        })),
        markLine: {
          symbol: "none",
          silent: true,
          lineStyle: { type: "dashed", color: PAPER.hairline, width: 1.2 },
          data: [{ xAxis: medianVolume }, { yAxis: medianIntensite }],
        },
      },
    ],
  };
}

export function reportLine(
  series: { name: string; color: string; yAxisIndex: number; data: { year: number; value: number }[] }[]
): EChartsOption {
  return {
    animation: false,
    tooltip: { trigger: "axis", ...tooltip() },
    legend: {
      top: 0,
      itemWidth: 12,
      itemHeight: 2,
      itemGap: 14,
      textStyle: { color: PAPER.muted, fontSize: 11 },
    },
    grid: { left: 8, right: 8, top: 30, bottom: 6, containLabel: true },
    xAxis: { type: "category", ...axis(false), axisLabel: { color: PAPER.muted, fontSize: 10 } },
    yAxis: [
      { type: "value", ...axis(false), axisLabel: { color: PAPER.muted, fontSize: 10, formatter: "{value} %" } },
      { type: "value", ...axis(true), splitLine: { show: false }, axisLabel: { color: PAPER.muted, fontSize: 10, formatter: "{value} %" } },
    ],
    series: series.map((s) => ({
      name: s.name,
      type: "line",
      smooth: true,
      symbol: "circle",
      symbolSize: 4,
      yAxisIndex: s.yAxisIndex,
      lineStyle: { width: 2.4, color: s.color },
      itemStyle: { color: s.color },
      areaStyle: { opacity: 0.06, color: s.color },
      data: s.data.map((d) => d.value),
    })),
  };
}
