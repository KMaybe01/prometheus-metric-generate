# Prometheus Metric Mock

模拟 Prometheus 指标的可视化工具，支持实时数据生成和 Push Gateway 推送。

<img src="./demo.png" alt="Prometheus Metric Mock Demo" width="800"/>

## 功能特性

- **创建指标** - 支持自定义指标名称、类型（gauge/counter/histogram/summary）和标签
- **粘贴整条 metric 导入** - 直接复制 Prometheus 格式的完整指标行（含 labels），点击 Add 自动解析生成并推送
- **值上下限** - 支持设置生成值的 Min/Max，自动生成的值不会超出该范围；下限不设置时默认从 0 开始
- **Label 多候选值** - label value 支持用 `|` 分隔多个候选值（如 `job=a|b`），每次生成随机取一个
- **同名指标合并（多 Series）** - 新增同名指标时自动合并为一张卡片的多条 series，每条 series 拥有独立的 label 组合和生成值
- **卡片点击编辑** - 点击指标卡片（或 Edit 按钮）弹出编辑弹窗，可修改名称/类型/步长/上下限，逐条 series 增删 label
- **Series 批量解析** - 编辑弹窗中可一次粘贴多条 `{...}` label 组合，批量解析为 series 并自动去重
- **自定义步长** - 支持设置 Step 步长，控制数据变化的剧烈程度
- **实时模拟** - 自动生成模拟数据，支持多指标并发运行，可配置全局推送间隔
- **动态视觉反馈** - 开启数据生成时，指标卡片会有明显的轮转动画边框
- **Push Gateway 并发推送** - 支持多个指标同时向 Push Gateway 推送数据，互不干扰
- **即时推送响应** - 开启推送开关时立即执行一次推送，随后进入定时任务
- **自动 Job 命名** - 每个指标使用自身名称作为 Push Gateway 的 Job 名称
- **连接测试** - 可在保存配置前测试 Push Gateway 连接是否正常
- **暂停/恢复** - 单独控制每个指标的运行状态
- **卡片折叠** - 点击指标名称可折叠/展开详情
- **数据持久化** - 使用 localStorage 保存配置，刷新页面不丢失（旧版单 series 数据自动迁移）
- **可视化输出** - 实时显示 Prometheus 格式的指标数据

## 运行

```bash
bun install
bun run dev
```

访问 http://localhost:5173

## 使用方法

### 1. 配置 Push Gateway

点击顶部的 "Configure" 按钮，填写：
- **Push Gateway URL** - Push Gateway 地址（必填）
- **Push Interval** - 推送和生成数据的间隔时间，必填，最小值为 500ms（默认 2000ms）

点击 "Test Connection" 可测试连接，配置完成后点击 "Save" 保存。

### 2. 添加指标

在顶部表单中：
- 输入指标名称（如 `http_requests_total`）
- 选择指标类型
- 可选添加标签（如 `method=GET,status=200`；多候选值用 `|` 分隔，如 `job=a|b`）
- 设置步长 Step（控制每次变化的幅度）
- 设置 Min / Max（生成值上下限，可选）
- 点击 "Add"

**粘贴整条 metric 快速导入**：在表单第二行的输入框中直接粘贴完整指标行，点击 Add 自动解析名称和全部 labels 并创建（已配置 Push Gateway 时自动开始推送），例如：

```promql
geo_healthy_alarm_gauges{app="combo-smf2-rmsvc", axnf="combo-smf2", container="axsvc", endpoint="http2", instance="[fd01:0:0:1::224c]:8088", job="combo-smf2-rmsvc", mgmt="rmsvc", name="primary", namespace="vzw-da-smf", nf_id="0d2b9f13-5906-45bf-ad65-bd3228f6b639", nf_namespace="unknown", nf_type="SMF", pod="combo-smf2-rmsvc-5846d98f97-fsm26", reason="ManualSwitchover", service="combo-smf2-rmsvc", vendor="casa"}
```

**同名指标自动合并**：多次添加指标名称相同的条目（如不同 pod 的同一条指标），会自动合并到同一张卡片中，作为多条 series 并列展示，各自区分不同的 label 组合；完全相同的 label 组合会被去重跳过。

### 3. 编辑指标

点击卡片标题区域（或右上角 Edit 按钮）弹出编辑弹窗：
- **基础信息** - 修改指标名称、类型、Step、Min/Max 上下限
- **Series 编辑** - 每条 series 一个卡片，可对 label 进行新增（Add Label）、删除、修改 key/value；可删除整条 series 或点击 "Add Series" 新增
- **批量解析** - 在 "批量解析 Series (Batch Parse)" 输入框中粘贴一条或多条 `{app="xxx", job="yyy", ...}`（也支持带名称前缀的完整指标行），点击 "Batch Parse & Add Series" 一次解析为多条 series，自动去重

保存后每条 series 的当前值保留；新 series 从下限值开始生成。

### 4. 控制指标

卡片标题栏：
- **指标名称** - 点击可折叠/展开卡片详情
- **Type 标签** - 显示指标类型
- **Series 数量标签** - 多条 series 时显示总数（如 `3 series`）
- **Pushing 标签** - 推送中时显示
- **Generate Metric 开关** - 控制指标是否持续生成。开启时，卡片背后会出现**绿色的放射状呼吸光效**，主体背景保持半透明，视觉上非常柔和且明显。
- **Push 开关** - 控制是否推送到 Push Gateway（支持多指标同时推送）。开启时，卡片边缘出现**蓝色的旋转光束**，内部背景保持静止。
  > **Note**: 当同时开启生成和推送时，蓝色光束在边缘转动，同时卡片内部透出绿色的呼吸光效，两者完美重叠互不干扰。

### 5. 卡片详情

点击指标名称展开卡片后，可查看：
- **Current Value / Series 列表** - 单条 series 时显示当前值和更新时间；多条 series 时逐行显示每条 series 的当前值、label 组合和更新时间
- **Labels** - 各 series 的标签（含多候选值 `|` 的标签以橙色标识）
- **Step** - 步长设置
- **Range** - 生成值上下限（设置了 Min/Max 时显示）
- **Prometheus Output** - Prometheus 格式的输出（包含全部 series）

## 值生成规则

- **下限默认 0**：不设置 Min 时，生成值从 0 开始；设置后从 Min 开始
- **范围钳制**：设置了 Min/Max 后，所有自动生成的值都不会超出 `[Min, Max]` 范围
- 保存编辑弹窗时，已有 series 的当前值会被钳制到新的范围内

## Push Gateway 推送规则

每个指标会推送到 `{PushGatewayURL}/metrics/job/{metric_name}`，例如：
- 指标名 `http_requests_total` → 推送到 `/metrics/job/http_requests_total`
- 指标名 `li_oam_user_counters` → 推送到 `/metrics/job/li_oam_user_counters`

同一指标的多条 series 会合并为一个请求体推送（`# HELP` / `# TYPE` 一次，每条 series 一行数据）。

## 指标类型

| 类型 | 描述 | 生成行为 |
|------|------|----------|
| Gauge | 当前值，可增减 | 在当前值基础上随机 +/- (1 ~ Step)，结果限制在 [Min, Max] 内 |
| Counter | 单调递增计数器 | 在当前值基础上递增 (1 ~ Step)，达到 Max 后封顶 |
| Histogram | 直方图 | 在 [Min, Max] 范围内取随机值（未设置时默认 0~1000） |
| Summary | 摘要 | 在 [Min, Max] 范围内取随机值（未设置时默认 0~1000） |

开启 "Generate Metric" 开关后，数值会根据配置的间隔（Push Interval）持续更新。

## 配置持久化

所有配置（指标列表、Push Gateway 设置）会自动保存到 localStorage，刷新页面后自动恢复。旧版本的单 series 数据格式会自动迁移为新的多 series 结构。

## 代码质量

- **包管理**: [bun](https://bun.sh) — 高性能 JavaScript 运行时与包管理器
- **代码规范**: [Biome](https://biomejs.dev) — 统一的 lint 与格式化工具
  - `bun run lint` — 检查并自动修复代码问题
  - `bun run format` — 格式化代码
- **CI/CD**: GitHub Actions — 每次推送自动执行 lint、类型检查和构建

## 项目结构

```
.github/
└── workflows/
    └── ci.yml            # GitHub Actions CI/CD
src/
├── types.ts              # 类型定义（MetricConfig / MetricSeries）
├── utils.ts              # 工具函数（解析、值模拟、迁移）
├── components/
│   ├── MetricCard.tsx    # 指标卡片组件（多 series 展示）
│   ├── MetricEditModal.tsx # 指标编辑弹窗（label / series 编辑、批量解析）
│   ├── MetricForm.tsx    # 添加指标表单（含粘贴整条 metric）
│   └── ServerConfigModal.tsx # 配置弹窗
└── App.tsx               # 主组件（同名合并、定时生成、推送）
biome.json                # Biome 配置
```
