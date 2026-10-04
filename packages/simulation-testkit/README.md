# @wishflow/simulation-testkit

版本化的仓库内模拟实验编排包。它不依赖具体游戏、物理库或 UI，项目通过高层场景适配器接入。

## 场景适配器

适配器模块应导出 `runScenario(config, seed, sampleOptions)`。每次调用必须在函数内创建并释放本轮模拟状态，并返回 `timeSeries`、`endReason` 和领域指标；适配器不应把可变模拟状态保存在模块级变量中。若场景确实需要实例状态，可改为导出 `createScenario()`，Worker 会在每个任务开始时创建新适配器实例。

```js
export function runScenario(config, seed, sampleOptions) {
  // 这里驱动完整场景的公开接口，并返回可结构化克隆的数据。
}
```

## 并发池

```js
const pool = new SimulationWorkerPool({
  size: 4,
  scenario: { moduleUrl: pathToFileURL(adapterPath).href },
});
const scenario = pool.createScenario();
const outcomes = await scenario.runBatch([
  { config: firstConfig, seed: 'RUN-001' },
  { config: secondConfig, seed: 'RUN-001' },
]);
await pool.close();
```

池内常驻 `worker_threads` 数量固定为 `size`。任务按提交次序生成稳定 ID，超出池大小的任务排队；结果保持提交次序。一个任务失败会返回带原始配置、种子和错误信息的失败记录，不自动重试。意外退出的 Worker 会被重建以处理后续任务，但中断任务只标记失败一次。

## 结果工具

包提供分位数、阈值时间、批量指标汇总和 JSON/CSV 导出。领域预测和校准逻辑由应用维护；共享层只处理通用实验结果。
