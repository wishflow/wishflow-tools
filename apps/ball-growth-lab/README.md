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
- 场地边长可调。球径按场地比例缩放；无缺口时在上半区按种子生成互不重叠的球，有缺口时从顶部开口内侧生成。
- 初速度强度、球间速度波动、主方向和角度扩散均可调。0° 向右、90° 向下、180° 向左、270° 向上；默认朝上发射并保留方向随机性。
- 球离开边界后移除并计数。开始后配置锁定；重置复用同一种子，生成新种子可开启另一组实验。场内最高球速会实时显示。
- 球和边界的恢复系数均为 1，摩擦、线性/角阻尼均为 0，刚体不允许休眠。重力本身只改变速度方向，不负责消耗能量；默认值设为 2 m/s²，让初速度能支撑更均匀的上下运动，重力仍可调至 0–20。
- 两球第一次接触时按繁殖概率尝试生成等大的新球；同一球对受冷却时间约束。新球和父球会重新分配速度，保持动量与包含新球重力势能的总能量；能量不足或没有安全空位时计入“未出生”。
- 人口目标是结束条件：达到后 Worker 冻结物理步进并显示“实验完成”，不会把被人口目标挡住的出生计入“未出生”。

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

物理步进在 Worker 中以固定 1/240 秒运行，Rapier 使用 6/2 求解迭代；高速时会按球速增加子步，避免单步穿过球或边界，速度不做硬裁切。Worker 每秒发送最多 60 次画面快照，React 不逐帧更新球坐标。PixiJS 用共享纹理和 ParticleContainer 绘制球体。

## 验证与性能

```bash
npm run test:ci
npm run benchmark
npm run benchmark:gaps
```

性能数据、测试边界及缺口宽度扫描条件见 [`docs/performance-baseline.md`](docs/performance-baseline.md)。本地 Node 基准排除浏览器渲染与真实手机硬件，不能代替实机测量。

## 可复用 Codex skills

应用使用的设计、UI 审查、游戏开发和 PixiJS 性能 skills 安装在 Codex 全局技能目录。来源、安装位置和重装方式见 [`docs/reusable-skills.md`](docs/reusable-skills.md)。项目仓库不保存 skill 副本。
