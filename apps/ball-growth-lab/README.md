# 球群生长实验室

一个纯前端物理实验台，观察重力、边界缺口和碰撞繁殖规则如何影响球群数量。实验配置与状态只保存在当前页面，不上传或写入服务端。

## 本地开发

```bash
./scripts/install.sh
npm run dev
```

`npm run build` 构建到本目录的 `dist/`；在仓库根目录运行 `npm run build:site` 会构建所有登记应用，并把本应用复制到 `_site/ball-growth-lab/`。共享站的完整说明见根目录 [README](../../README.md)。

## 实验规则

- 正方形或圆形场地可以设置 0–8 个沿周长均匀分布、其中一个位于顶部的缺口。
- 球径统一。无缺口时，按种子在场内随机生成互不重叠的球；有缺口时，从顶部缺口外侧排队落入。
- 球离开边界后移除并计数。开始后配置锁定；重置复用同一种子，生成新种子可开启另一组实验。
- 两球第一次接触时按繁殖概率尝试生成等大的新球；同一球对受冷却时间约束。新球只能占用场地内的空位，人口上限或位置不允许时计入“未出生”。
- 出生时父球和新球重新分配速度，使总线动量保持；因为总质量增加，不保证动能守恒。

## 代码结构

| 路径 | 职责 |
| --- | --- |
| `src/App.tsx`、`src/components/` | 设置、状态和数量图表 |
| `src/physics/` | Rapier 刚体世界、繁殖规则、空间哈希与 Web Worker |
| `src/rendering/` | PixiJS 场景与球体粒子绘制 |
| `src/arena.ts`、`src/random.ts` | 边界几何与可复现随机数 |
| `tests/` | 几何、复现、碰撞、繁殖、离场、上限和动量测试 |
| `scripts/benchmark.ts` | 100/500/1000 球的固定步长性能基准 |
| `scripts/gap-scan.ts` | 缺口宽度与球径比例的重复进出测试 |
| `scripts/experimental/` | Planck 对照实现与 typed-array/均匀网格批量候选；均不用于产品运行 |

物理步进在 Worker 中以固定 1/60 秒运行；React 不逐帧更新球坐标。PixiJS 用共享纹理和 ParticleContainer 绘制球体。

## 验证与性能

```bash
npm run test:ci
npm run benchmark
npm run benchmark:gaps
```

性能数据、测试边界及缺口宽度扫描条件见 [`docs/performance-baseline.md`](docs/performance-baseline.md)。本地 Node 基准排除浏览器渲染与真实手机硬件，不能代替实机测量。

## 可复用 Codex skills

应用使用的设计、UI 审查、游戏开发和 PixiJS 性能 skills 安装在 Codex 全局技能目录。来源、安装位置和重装方式见 [`docs/reusable-skills.md`](docs/reusable-skills.md)。项目仓库不保存 skill 副本。
