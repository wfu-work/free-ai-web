# TokenTrendChartComponent

用于网关工作台和用量分析的统一 Token 时间趋势组件。组件负责主题适配、图例、汇总口径、空状态和 ECharts 懒加载；页面只需要提供标准化时间点。

```html
<app-token-trend-chart
  title="Token 用量趋势"
  periodLabel="30 天"
  [points]="tokenTrendPoints"
  [loading]="loading"
/>
```

`TokenTrendPoint` 包含 `label`、`inputTokens`、`outputTokens` 与 `cachedTokens`。缓存 Token 是输入 Token 的子集，因此组件的“窗口总量”只计算输入与输出之和。
