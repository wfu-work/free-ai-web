# ModelCallTrendChartComponent

用于工作台和用量分析的模型调用趋势组件。页面提供统一的时间标签和模型序列，组件负责模型图例、调用汇总、深浅主题、空状态和折线渲染。

```html
<app-model-call-trend-chart
  periodLabel="30 天"
  [labels]="modelTrendLabels"
  [series]="modelTrendSeries"
  [loading]="loading"
/>
```

每个 `ModelCallTrendSeries` 包含模型名、窗口调用总数以及与 `labels` 一一对应的调用数量。建议最多提供 5 个模型和 1 个“其他”系列。
