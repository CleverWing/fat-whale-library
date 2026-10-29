# 大肥鱼 DSH 自动接入插件 0.3.1

安装后，插件自动领取并保存本安装的大肥鱼 ID，再通过官方 MCP client 连接云端集中维护的知识库。用户不填邮箱、MAC、调用 ID 或 DeepSeek API Key，不下载知识库，也不用启动 Python 服务。用户自己的 DeepSeek 模型配置仍由 DSH 管理，本插件不读取、转发或哈希它。

默认服务地址：`https://livecompanion.duckdns.org/dafeiyu`。网页、安装注册、MCP 与统计使用同一 origin 和路径前缀；具体公网运行状态以服务页和本轮部署回执为准，不把旧本机快照演示当作云端更新验收。

## 安装到正在使用的 profile

1. [下载配置与插件代码包](https://livecompanion.duckdns.org/dafeiyu/connect/dafeiyu-dsh.zip)，解压。
2. 使用官方 CLI 安装解压目录，将下方 `desktop` 换成实际使用的 profile：

```powershell
dsh plugin --profile desktop add '<解压目录>/dafeiyu-dsh'
```

Windows 桌面版没有 `dsh` 命令时，可直接调用随应用安装的入口：

```powershell
& "$env:LOCALAPPDATA\Programs\DeepSeek Harness\resources\runtime\cli\bin\dsh.cmd" plugin --profile desktop add '<解压目录>/dafeiyu-dsh'
```

3. 重启该 profile 的 DSH。插件首次连接前生成私密安装 key，写入官方凭据服务；服务器按这个 key 领取稳定随机 ID，之后自动在 MCP HTTP 请求头发送 `X-Dafeiyu-ID`。

配置包只有 `package.json`、`index.js`、`identity.mjs`、`status.mjs`、`cordis.patch.yml`、`README.md`，不含 Python、RAG 索引、账号库或任何现成凭据。包使用预构建 JavaScript，无编译或安装脚本。官方 Desktop 支持本地链接包的 peer 从现有运行时解析；0.3.1 补齐 schema peer，避免 0.3.0 缺依赖而未运行。安装时包管理器仍可能解析其他依赖，不能把“无构建脚本”误称为完全离线安装。

overlay 仍使用 `mcp-dafeiyu` 条目 ID；从旧手填 ID 版升级时，应替换实际生效的旧条目，保留其他插件和模型配置，避免同时加载两个同名 MCP 服务。不要用整份示例覆盖个人 profile。

## 可以调用的三个工具

| 工具 | 用途 |
| --- | --- |
| `mcp__dafeiyu__dafeiyu_find_videos` | 按主题找 BV、同源概述与可用完整关键词，保持轻量，不返回时间段；可排除已看 BV |
| `mcp__dafeiyu__dafeiyu_get_video` | 已知 BV 时精确取该视频；配置可用富源后默认返回全文概述、关键词和真实时间段 |
| `dafeiyu_usage` | 无参数，只读查看本安装访问频率和提醒，返回统计与 ID 尾 8 位 |

例如可以问“我的知识库访问频率怎么样，有没有提醒？”。用量工具不领取新 ID、不占知识查询额度，不把完整 ID、安装 key、原始 IP 或其他账号资料返回模型。HTTP 成功数不等于视频命中或 MCP 工具成功；多来源提示也不是滥用判定。

已有 BV 时先精确查询，不能用其他视频顶替。不存在返回 `found:false`、`item:null`，只有服务端持久登记成功才有 `missing_recorded:true`。缺失 BV 按香港时间 **00:00 / 12:00** 半天窗口生成待补清单；不会因此自动采集、播放视频或调用付费模型。实际观看仍由机器人的观看工具完成。

### 读已有的分时段知识

先用主题工具选片，需要详情时再按 BV 调用精确工具，参数仍只有 `bvid`，不用加新开关。可用富卡的 `summary` 来自既有 overview 全文，`keywords` 最多 128 项；`segments` 带 `page/start/end/title/summary/facts/screen`，按源中实际段数返回，不硬拆十段。未知 end 为 `null`，不补造结束时间；多 P 的 `time_bounds:"video_total_only"` 仅有总长保守上界，不能当逐 P 时长已验证。

查看 `details` 判断状态、数量与来源指纹。`complete:true` 只表示**全部当前源分段按预算/过滤规则返回**，不表示覆盖视频所有秒或内容事实已核实；`filtered` 只说明源文本确有清理变化。`verification:"source_ai_summary_unverified"` 明示源 AI 摘要未经本次原视频事实核验，源内文字、数字与画面描述可能冲突，接口不自动纠正。不要把这些标记或 SHA 当成实际看过视频的证明。

单卡规范紧凑 UTF-8 JSON 投影预算为 256 KiB，不含 HTTP/MCP 封装或重复开销；最多 1000 段，facts/screen 每个列表最多 100 项。超限或富源不可用会回基础概述、空关键词/时间段和固定原因码，不静默截取；`found:true` 但 details 不可用也不等于缺失 BV。未配置富源可保持旧八字段兼容。富源随既有导出变化按请求自动重载，不改 LiCO compact 索引，也不进行新采集、观看、摘要模型或付费调用。DSH 投稿不参加此增强链，highlights 点位不会补造为时间区间；投稿 v1 不扩展。字段与全部限制见[请求说明](../docs/request-format.md#富视频卡返回)。

## 提交本人掌握的视频梗概

**当前状态：已开放接收待审。** 首次收件由当前已安装 Harness 的官方插件运行时、现有凭据完成，未经过桌面 GUI 或模型选工具。随后已在真实桌面 GUI 新会话中由模型完成同一材料幂等复投与本人状态查询，返回 `duplicate:true`，保持同一贡献编号、内容哈希和原等待时钟，仍为 `pending_review`。两次均复用既有 Bot 视频材料，没有新增观看或生成视频事实。真实自然 24 小时、独立批准及真实已审内容发布仍未观察；至少满 24 小时，且独立管理员在服务主机本地 CLI 明确批准，才允许发布，绝不到期自动批准。2026-10-26 版的“在线投稿未开放”保留为历史阶段。本插件 0.3.1 已通过官方 MCP client 发现服务端新增工具，不需要改插件 JavaScript 或重新填写 ID；旧连接未显示新工具时，重连 MCP 后再检查发现结果。

| 远程新增工具 | 用途 |
| --- | --- |
| `mcp__dafeiyu__dafeiyu_submit_video` | 提交单个原视频、单 P 的梗概到独立待审区 |
| `mcp__dafeiyu__dafeiyu_contribution_status` | 以贡献编号回查本人投稿状态 |

使用[投稿格式](../docs/contribution-format.md)、[Schema](../docs/contribution.schema.json)和[合成格式示例](../docs/contribution.example.json)。必填 `schema_version:1`、原 BV、至少 12 个可见字符且最多 5000 字符的 `summary`、来源 `provenance`；建议用 100–250 字写清内容、过程与结果。page 默认 1，标题、标签和真实时间点可选，未知信息省略，不补造 Bot segments。内容 UTF-8 JSON 上限 32 KiB，MCP envelope 总上限 64 KiB。示例不是实际视频，不可原样实投。

在当前 Harness 新会话中可说：“请调用大肥鱼投稿工具提交以下 JSON，保留服务端贡献编号；不要把收件说成已入库。”随后附自己的真实内容。工具参数只传内容，插件自动通过 HTTP `X-Dafeiyu-ID` 认证；状态查询只传返回的贡献编号，不放 ID、IP、API Key 或安装 key。查看真实工具回执后，再要求使用投稿状态工具查询同一贡献编号。直接 REST 脚本不等于 Harness 真实提交。

提交工具直接接收 v1 字段，不套 `contribution` 外层；状态工具参数只有 `{"contribution_id":"DFC-<32位小写十六进制>"}`。回执有贡献编号、状态、内容哈希和服务器接收/到期时间，不返回 ID/IP 或投稿正文；保留编号即可回查。

服务端返回 `pending_review` 仅表示持久收件。至少等待服务器接收后的 `86400` 秒，独立管理员阅读原始材料后确认来源、内容支持、原视频、无秘密、无执行指令五项并核对内容哈希，才可批准为 `approved` 后发布；满 24 小时不会自动批准，普通 DSH 没有审核权。成功 `published` 才可检索，修改内容生成新的待审修订。确定性初筛不证明所有事实或安全性。

投稿写入默认每 ID 滚动 24 小时 10 次、每来源 IP 滚动 24 小时 30 次，是本版实施值；状态工具不扣知识查询额度。原知识 ID/IP 各 5/60 秒保持，超限按 `Retry-After` 等待。投稿不会自动启动采集或调用付费模型。

所有 DSH 发布知识进入独立的 `/var/lib/dafeiyu-kb/rag/dsh_videos.json`，LiCO 默认不加载、扫描或检索这份目录外分区；多 P 聚合仍明确标 P 和 basis，未审核 P 不混入。DSH 暂不按视频年龄自动淘汰，不套用热点 H 的 15 天 TTL。共享 CPU/磁盘对实际墙钟耗时的影响仍需另测。

## 本机查看完整 ID（不会交给模型）

用户需要手动核对完整 ID 时，在自己的终端执行：

```powershell
dsh plugin --profile desktop exec dafeiyu-status
```

Windows 未配置 `dsh` 命令时，将命令前的 `dsh` 替换为前面完整的 `dsh.cmd` 路径。结果只包含本插件的服务地址、完整 `userId` 和本地最近保存的启用状态，不包含安装 key；本地状态不是实时向服务器查询。不要将输出粘贴给模型或发布到公开位置。

此命令只读官方凭据文档中的本插件记录，不创建、迁移、修改或删除凭据，不访问网络、不触发注册。尚未领取会提示 `not_enrolled`，损坏记录会安全报错。官方凭据 UI 可以显示记录是否存在，但不提供直接展示本记录完整 ID 的专用操作。

状态命令不加载 MCP 插件。它使用官方 credentials-local 纯解析函数；本地链接包没有 node_modules 时，复用 Desktop CLI 通过 `DSH_DESKTOP_NODE_EXECUTABLE` 指定的安装运行时，不依赖用户目录固定路径。请从上述官方 `dsh plugin ... exec` 入口运行；普通 `node status.mjs` 在缺少官方模块与运行时入口时会安全报错。

## 私密持久化与失败处理

插件使用 `ctx.credentials.modifyRecord`，独立 namespace 为 `dafeiyu-installation/service-<完整规范化服务URL的哈希>`。官方本地 provider 对写操作跨进程加锁、重新读取并原子写入；默认凭据文件沿用 DSH 自己的受控位置，不在项目或模型工具参数中保存安装 key。

- 安装 key 是密码学随机 32 字节，不来自 MAC、邮箱、硬件号或模型 API Key。服务器保存其哈希。
- 先持久化 key，再发送注册请求。重启、并发、响应丢失或超时都复用同一个 key；损坏记录失败停止，不静默重建。
- 注册请求只发往配置的服务 origin / prefix，禁止重定向。MCP 与统计使用同一前缀。
- 禁用返回 `403`，停止连接并保留原 key 与 ID，不通过重新注册逃避禁用。
- `429` 按 `Retry-After` 保存冷却时间；本次不自动重试，冷却期间重启也不立即请求。其他连接失败同样不循环重试。
- 卸载插件不会主动删凭据。若手动删除私密记录、换服务地址或清空 DSH 数据，可能成为新安装；这不是 DeepSeek 账号身份，也不保证一人一个 ID。
- 原用户 ID、旧 Token、邮箱账号和 DeepSeek 凭据值保留。新插件只写自己的记录，不调用其他凭据的 resolve / list / unset。

## 高级配置

普通用户使用默认服务即可。维护者可在启动环境设置 `DAFEIYU_SERVICE_URL`，或在本条配置覆盖 `serviceUrl`：

```yaml
- insert:
    - id: mcp-dafeiyu
      name: dsh-dafeiyu-kb
      config:
        serviceUrl: https://livecompanion.duckdns.org/dafeiyu
        enrollmentTimeoutMs: 15000
        toolCallTimeoutMs: 30000
```

公网只允许 HTTPS；URL 不带用户名、密码、查询参数或片段。仅隔离本机测试可同时显式设置 loopback HTTP 地址与 `allowLoopbackHttp:true`。不同服务路径前缀使用不同的私密记录，不会把一个服务的安装 key 交给另一个服务。

已有 stdio 示例仍供维护者手动 ID 集成，普通用户不需要它。`/v1/videos/search` 和 `/v1/videos/lookup` 是 REST，不是 MCP 地址；本插件自动使用服务根路径下的 `/mcp`。

## 核验范围

目标官方版本为 DSH **0.2.1-rc.3**、Cordis **4.0.5**、MCP client **2.2.0**。本批使用已安装桌面程序的官方 Node **24.21.0**、credentials-local、Cordis、ToolRuntime 与 MCP client，在隔离凭据和本机合成 HTTP/JSON-RPC fixture 上验证发现、执行、重启、两个独立进程并发、禁用、超时、冷却、重定向和只读状态工具。fixture 不是生产知识库或真实模型对话，相关失败与修复证据保留在 `runtime/dafeiyu-install-id-20261029-01/plugin/`。

服务器、公网 TLS / 路由、实际用户 profile 安装、当前版真实模型路由和持续更新分别验收；不能用旧 1692 条快照、旧插件或本批合成测试代替。官方 bundle 与 profile 机制参见[固定版本分发文档](https://github.com/deepseek-ai/deepseek-harness/blob/22ddee3792402c3e70ec5f86a63c3e3e895a2f60/docs/user/develop/basic/publish.md)，MCP 机制参见[官方 MCP client 文档](https://github.com/deepseek-ai/deepseek-harness/blob/22ddee3792402c3e70ec5f86a63c3e3e895a2f60/packages/mcp/mcp-client/README.md)。
