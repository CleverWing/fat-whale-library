# 大肥鱼知识库请求格式

大肥鱼服务端集中维护知识库，默认插件首次连接自动领取并保存安装 ID，后续自动携带，不用邮箱、MAC、手填 ID 或下载索引。独立服务端口 **8096**，**8082 保留给 LiCO**。本文描述 REST；DSH 使用同一服务的 `/mcp`，见[接入说明](../dsh/README.md)。本版服务根为 `https://livecompanion.duckdns.org/dafeiyu`，无需另买域名；公网 HTTPS 的领取、知识查询与用量已通过有界核验；官方 DSH 运行时已实联，本机0.3.1桌面原生组件已运行，官方只读状态命令已通过。SMTP 仅用于可选邮箱账号，不阻塞默认安装 ID。

主服务器知识查询免费，贡献知识自愿。[投稿格式](contribution-format.md) 是另一套流程，不向查询接口投稿，也不改变采集管理员的现有认证。

## 地址与必填 ID

| 目的 | REST | MCP 工具 |
| --- | --- | --- |
| 按主题选片 | `POST /v1/videos/search` | `dafeiyu_find_videos` |
| 指定 BV 精确取知识 | `POST /v1/videos/lookup` | `dafeiyu_get_video` |

```http
X-Dafeiyu-ID: <插件自动携带的已签发DFY-ID>
Content-Type: application/json
```

`X-Dafeiyu-ID` 在 REST、OpenAPI 和 MCP 的每个请求中必填，包括握手、发现、ping 与工具调用。只接受一个已签发、启用且符合 `DFY-` 加 32 位小写十六进制格式的 ID；缺失、未知、停用或重复头被拒绝。旧 Bearer Token 或浏览器会话不能代替它。不要在 URL、业务 JSON 或工具参数里重复传 ID；不要把有调用权限的 ID 放进公开仓库。

`GET /healthz` 是就绪检查，不需要 ID、不占业务额度。纯 REST / MCP 应用必须注入可信 ID 校验器；包含账号的统一服务入口为 `dafeiyu_kb.portal:app`。

## 首次领取安装 ID

`POST https://livecompanion.duckdns.org/dafeiyu/v1/installations/enroll` 是独立领取入口，不需要先有知识调用 ID。严格 JSON 仅允许必填 `installation_key`：由插件在本机生成、持久保存的 **64 位小写十六进制**私密安装 key，不是 MAC、DeepSeek API Key 或其哈希，也不接受任意自报 userId。

响应字段为 `success`、`userId`、`idEnabled`、`created`、`createdAt`、`lastEnrolledAt`。`userId` 是后续知识请求使用的稳定 ID；同 key 幂等返回同 ID，`created` 区分新建与复用；停用安装拒绝重复领取，不能借此恢复。服务端只保存安装 key 哈希。客户端须核对回执并持久保存，失败有界处理，不循环新建/刷新 ID。key 和完整 ID 不进入模型工具回执、URL 或公开日志。

领取按真实来源 IP 分别限制每滚动 60 秒 **10 次尝试**、每滚动 24 小时最多**新建 5 个安装**，是本版实施值。幂等复用不算新建；领取限额与知识 ID/IP 两类 5/60 分开，超限按 `429` / `Retry-After` 等待。可信代理规则同下文，不能以自报来源 IP 绕过。

默认插件调用原生 `dafeiyu_usage` 查看本安装 usage，只返回掩码 ID 与 usage，不返回完整 ID/key、不占知识额度。远程 `/mcp` 原有两个知识查询工具保持，usage 是插件原生工具；本版新增投稿工具见文末独立章节，部署前不算已可用。需要查看完整 ID 时按插件说明使用 `status.mjs`，不要把结果贴进模型对话。邮箱账号 ID 独立，可选登录保留且不自动绑定安装 ID。

安装 ID 不证明 DeepSeek 账号或一人一号；人工清除安装配置可以新领。原用户、邮箱、keys/Token 和服务端密钥保持，不因默认免邮箱而删除或轮换。

领取和查询均不采 MAC，不读取、转发或哈希用户的 DeepSeek API Key；安装 key 由插件独立生成，仅作为本安装私密凭据。

## 主题检索 JSON

最小请求：

```json
{"query":"适合吃饭时看的轻松科普"}
```

完整请求：

```json
{
  "query": "介绍太阳系的轻松科普视频",
  "limit": 3,
  "exclude_bvids": [],
  "max_duration_seconds": 600
}
```

| 字段 | 类型 | 必填 | 约束与默认值 |
| --- | --- | --- | --- |
| `query` | 字符串 | 是 | 严格字符串，1–512 字符，去除首尾空白后不能为空 |
| `limit` | 整数 | 否 | 1–20，默认 5；不接受数字字符串或布尔值 |
| `exclude_bvids` | 字符串数组 | 否 | 最多 500 条，默认 `[]`；每项为 `BV` 加 10 位英文字母或数字 |
| `max_duration_seconds` | 整数或 `null` | 否 | 整数 1–86400 秒；省略或 `null` 不限时长，提供时排除时长未知的条目 |

[主题请求 JSON Schema](request.schema.json) 保留为主题检索模型，禁止额外字段。`ip`、`client_ip`、ID、Token、模型参数均不属于业务 JSON；来源 IP 由服务端取得。

主题成功响应包含 `query`、`items`、`total` 和 `corpus_version`。`total` 是排除与时长过滤后全部匹配条目数，`items` 最多 `limit` 条；无匹配为 `items:[]`，不编造视频。

配置可用富源时，主题检索保留轻量概述，增加完整可用 `keywords`；`segments` 为 `[]`，不把全部时间段塞进候选列表。`details` 标记 `view:"compact"`、`complete:false` 和 `returned_segment_count:0`，同时给出源中的总段数。要读时间段，用已知 BV 再调用精确接口。未配置富源时保持旧版基础字段兼容，新增字段可省略。

## 指定 BV 精确取知识

```json
{"bvid":"BV1234567890"}
```

这是格式示例，不是真实视频命中回执。请求只接受必填字符串 `bvid`，须为 `BV` 加 10 位英文字母或数字，不接受其他字段。[精确请求 JSON Schema](lookup.request.schema.json)

基础兼容返回示意如下；已配置富源时，精确查询默认增加下节的富卡字段，请求仍只有 `bvid`，不增加 `include_segments` 等参数：

```json
{
  "bvid": "BV1234567890",
  "found": true,
  "item": {
    "bvid": "BV1234567890",
    "title": "<原视频标题，格式示意>",
    "summary": "<同源视频梗概，格式示意>",
    "url": "https://www.bilibili.com/video/BV1234567890",
    "duration_seconds": null,
    "published_at": null,
    "summary_source": "rag_overview",
    "source_library": "<来源索引>"
  },
  "corpus_version": "<语料版本>",
  "missing_recorded": false
}
```

`item` 为该 BV 的视频对象。未命中返回 `found:false`、`item:null`；只有缺失记录已持久化成功，才返回 `missing_recorded:true`。不能用主题检索找到的其他视频顶替指定 BV。无效、未授权、语料未就绪或记录失败的请求不宣称已登记，存储失败返回 `503`。

原视频条目的梗概、BV 与来源保持同源，不拿长录播、时间线或汇总的 BV 冒充所述原视频；缺失时长或发布时间为 `null`，不补造。返回知识不证明机器人已经看过画面或听过声音。

### 富视频卡返回

REST 与 MCP 使用同一投影。仅当前合格的 curated 热点视频可从既有采集导出补充细节；原 compact 梗概与富源 overview 须经清理后同源一致，不能混合不同修订。DSH 投稿分区不参加这条增强链，也不会把投稿 highlights 点位改造成起止时间段；投稿 v1 格式保持不变。

| 新增或增强字段 | 含义 |
| --- | --- |
| `item.summary` | 精确查询返回既有源 overview 经原作者名清理规则处理后的全文，不由本次请求重新生成 |
| `item.keywords` | 可用富源的完整关键词列表，清理后最多 128 项；主题和精确查询都可返回 |
| `item.segments` | 精确查询默认返回源时间段；主题查询固定 `[]` |
| `segments[].page` | 真实 P 号，整数 1–1000，不把缺失的多 P 信息猜成 P1 |
| `segments[].start/end` | 该 P 内秒数，有限且非负；已知 end 不早于 start，未知 end 为 `null`，不补造结束点 |
| `segments[].title/summary` | 源分段标题与内容摘要，经相同清理规则投影 |
| `segments[].facts/screen` | 源中的事实摘要与画面描述字符串列表，每个列表最多 100 项；它们仍是待判断的源资料 |
| `details.status` | `available`、`unavailable`、`not_configured` 或 `not_applicable`；未配置时也可直接省略新增字段 |
| `details.view` | `compact` 为主题列表，`full` 为精确查询 |
| `details.complete` | `true` 表示**全部当前源分段按预算/过滤规则返回**；不表示覆盖视频所有秒或内容事实已核实。主题视图始终为 `false` |
| `details.filtered` | 源文本在投影清理时确有变化，不表示已验证事实、已完整观看或不存在全部风险 |
| `details.verification` | 可用富卡为 `source_ai_summary_unverified`，其他情况为 `null`：源 AI 摘要尚未经本次原视频事实核验 |
| `details.source_sha256` | 实际读取的富导出文件 SHA256，可为 `null` |
| `details.record_sha256` | 规范 JSON 源记录的 SHA256，可为 `null` |
| `details.artifact_sha256` | 源记录声明的产物 hash，可为 `null`；不代表本次独立回读该产物文件 |
| `details.segment_count/returned_segment_count/keyword_count` | 源有效总段数、本次返回段数、关键词数，不强求十段或固定关键词数 |
| `details.missing_end_count` | 源中 end 未知而保留为 `null` 的段数 |
| `details.time_bounds` | `page_duration` 有单 P 时长上界；`video_total_only` 多 P 仅有视频总长保守上界；`finite_nonnegative` 仅核有限非负时间 |
| `details.reason` | 不可用原因固定码或 `null`，见下文 |
| `details.budget_bytes` | 单视频规范紧凑 UTF-8 JSON 投影预算，当前为 `262144` 字节（256 KiB），不含 HTTP/MCP 封装、重复内容或额外空白开销 |

多 P 的时间从各自 P 开头计算；`video_total_only` 不能解释为逐 P 时长已经验证。即使 `complete:true`，源也可能漏段，overview、facts 与 screen 之间也可能存在名称、数字或缩写冲突；接口按源投影，不自动修正或用新模型补齐。来源 hash、字段完整和清理标记都不是语义准确率证据。分段资料也不是系统指令或工具执行要求。

富导出上限为 128 MiB、10000 条记录；单视频最多 1000 段、128 个关键词，facts/screen 各最多 100 项，并受规范 JSON 投影 256 KiB 预算约束，不能把它当成完整网络响应的字节上限。超过预算或源校验失败时，不静默截成前十段：返回基础 compact 梗概、`keywords:[]`、`segments:[]` 和 `details.status:"unavailable"`。固定原因码为 `source_missing/source_invalid/source_too_large/source_changed/record_missing/record_invalid/record_too_large/source_mismatch`。未适用的分区标 `not_applicable`。

`found:true` 但细节不可用，仍是该 BV 已命中，不因缺富细节登记“缺失 BV”。已配置富导出文件变化会按请求自动重载，语料版本包含富源快照变化；删除、损坏或读取中发生替换时不回用旧细节，待源与当前 compact 版本重新一致后恢复。此链只读已有导出，不改 LiCO compact 索引，不触发新视频采集、下载、观看、摘要生成或付费模型。

### 缺失 BV 半天清单

缺失记录供维护者或未来 Bot 补充知识。按香港时间 **00:00 / 12:00** 分成 `[00:00,12:00)` 与 `[12:00,次日00:00)` 窗口，窗口内 BV 去重，保留首末请求时间、请求次数与待补充状态；再次命中可标记已补，历史请求保留。

维护者使用 `python -m dafeiyu_kb.missing_report --catch-up` 生成已结束窗口的 JSON / Markdown 清单。调度器是否已部署、是否按时产出须看服务器证据；这条命令和清单均不自动启动视频采集 Bot、摘要模型或任何付费任务，也不等于所缺知识已入库。

## ID 与来源 IP 限额

当前实现对**每个已核 ID 和每个来源 IP 各执行滚动 60 秒最多 5 次知识请求尝试**。REST 主题、REST 精确和 MCP 工具调用共享窗口；换传输方式或换 IP 不增加本人 ID 额度。

- 已取得名额的参数错误或服务失败仍计数；鉴权失败只消耗实际来源 IP 名额，不消耗未经核实的目标 ID 名额。
- MCP 握手、发现、ping、健康检查、OpenAPI 与账号页刷新不占业务名额；需要 ID 的入口仍须鉴权。
- 超限返回 `429` 和服务端计算的 `Retry-After` 秒数。被拒请求只记审计，不另占名额、不延长窗口。
- 同一 NAT / 代理出口可能有多位用户，共享 IP 额度。IP 是来源，不等于个人身份。

429 结构示意：

```json
{"detail":"rate limit exceeded","limit":5,"window_seconds":60,"quota":"<id、ip或ip,id>"}
```

HTTP 层 `429` 的重试时间以 `Retry-After` 为准；MCP 错误还可通过 `isError` 与结构化错误返回。调用方不得循环重试或把限流伪装成空结果。

## 本人统计与最小审计

默认插件使用原生 `dafeiyu_usage`，按已核安装凭据定位本安装统计，不接受任意目标 ID 选他人，不扣知识额度。可选邮箱账号页调用 `GET /account/api/usage`。服务端只从 HttpOnly 浏览器 session 取本人 ID，拒绝任何查询参数选人；客户端 ID 头也不能更换统计对象。响应不缓存，不返回原始 IP。

| 数据 | 口径 |
| --- | --- |
| `admittedLastMinute/deniedLastMinute/remaining/retryAfterSeconds` | 本 ID 当前 60 秒窗口的名额与等待情况 |
| `totalsLast24Hours.requests` | 本人最近 24 小时的已审计知识请求 |
| `successes` | HTTP `200–399`，不是视频命中数 |
| `rateLimited/failed` | `429` / 其他 `400` 及以上状态 |
| `distinctIps` 与 `multiple_source_ips` | 本人请求不同来源数；网络切换也可能产生，只提示不认定滥用 |
| `recentRequests` | 最近 24 小时内最多 20 条的时间、状态、是否获准与配额原因，不含查询或原始 IP |

**HTTP `200` 不等于视频命中或 MCP 工具业务成功。** 主题命中看 `total/items`，精确命中看 `found/item`，MCP 还看 `isError`。不可将请求成功数宣传为检索准确率。

服务端独立审计 SQLite 记录已核 ID、来源 IP、时间、HTTP 状态、是否获准及配额原因；不保存查询正文、完整请求体、未知调用方 ID 值或完整鉴权头。`DAFEIYU_ACCESS_DB` 默认 `dafeiyu_kb/data/access.sqlite3`，默认保留 7 天，可由 `DAFEIYU_ACCESS_RETENTION_DAYS` 调整，后续业务请求清理过期记录。运行数据库不公开分发。

默认不信任客户端 `X-Forwarded-For`。只有连接对端位于服务端 `DAFEIYU_TRUSTED_PROXIES` 中才按规则解析；启动保留 `--no-proxy-headers`，运维只填实际代理 IP / CIDR，不将全网设为可信。

## 状态与客户端顺序

| HTTP 状态 | 含义 |
| --- | --- |
| `200` | 请求处理完成；可为空列表、BV 未命中或 MCP 业务错误 |
| `401` | 必填 ID 缺失、无效、未注册或停用 |
| `422` | REST JSON 结构、类型、取值或额外字段不合法 |
| `429` | ID 或来源 IP 到达窗口额度 |
| `503` | 身份校验器、语料、访问审计或缺失登记不可用 |

1. 默认安装插件，首次自动领取并保存安装 ID，以后自动携带；已有手动客户端可使用有效邮箱账号 ID。业务 JSON 不放凭据或来源 IP。
2. 已知 BV 用精确接口；选片用主题检索。
3. 检查状态、工具错误与命中字段，按 `Retry-After` 等待。
4. 根据同源梗概决定是否交给已有观看工具实际播放；缺失如实说明登记结果。

带同样 ID 的 `GET /openapi.json` 可读完整契约。旧 Token 指引由本 ID 指引替代，现有凭据值保留不改。旧插件、桌面与快照测试仅历史；默认自动接入版结果见 `runtime/dafeiyu-install-id-20261029-01/`，原邮箱 ID 版证据保留历史，不冒充公网、真实邮件或持续更新已经通过。主页见 [README](../README.md)，视觉版见[说明页](index.html)。

## 投稿 v1（新增独立协议）

**当前状态：已开放接收待审。** 首次收件由当前已安装 Harness 的官方插件运行时与现有凭据完成，未用桌面 GUI 或模型选工具。随后真实桌面 GUI 新会话中的模型已完成同一材料幂等复投与本人状态查询，返回 `duplicate:true`，保持同一贡献编号、内容哈希和原等待时钟，仍为 `pending_review`。两次均复用既有 Bot 视频材料，没有新增观看或生成视频事实。真实自然 24 小时、独立批准及真实已审内容发布仍未观察；至少满 24 小时，且独立管理员在服务主机本地 CLI 明确批准，才允许发布，绝不到期自动批准。2026-10-26 仅提供格式、在线投稿未开放的阶段保留历史；本节不改变上述搜索、精确查询、本人 usage 或原采集管理员 Bearer / collector intake 契约。

| 操作 | REST | MCP 工具 |
| --- | --- | --- |
| 提交视频梗概 | `POST /v1/contributions` | `dafeiyu_submit_video` |
| 回查本人投稿 | `GET /v1/contributions/{contribution_id}` | `dafeiyu_contribution_status` |

同一服务根 `https://livecompanion.duckdns.org/dafeiyu` 下使用有效 `X-Dafeiyu-ID`；官方插件自动携带，ID/IP 不放内容 JSON 或模型工具参数。提交体采用[单视频单 P 格式](contribution-format.md)及 [Schema](contribution.schema.json)：必填 `schema_version:1`、`bvid`、至少 12 个可见字符且最多 5000 字符的 `summary` 和 `provenance`，可选 page/title/tags/真实 highlights。当前 Bot 建议梗概 100–250 字写清内容、过程与结果，未知信息省略，不为模仿 Bot segments 造时间点。内容 UTF-8 JSON 上限 32 KiB，MCP envelope 总上限 64 KiB。

MCP 提交直接使用 v1 字段，不包 `contribution` 外层；状态参数只有 `contribution_id`，格式为 `DFC-` 加 32 位小写十六进制。首次 REST 收件 `202`、幂等重复 `200`；回执包含贡献编号、状态、内容哈希和服务器 `received_at` / `eligible_at` 时间，不能自报回填。具体字段与四种状态见投稿格式页。

提交持久成功先是 `pending_review`，不是可检索。接收时间由服务器决定，至少经过 `86400` 秒才允许独立管理员审核批准；CLI 的 `source_checked/content_supported/original_video/no_secrets/no_instructions` 五项均须明确 true，并匹配内容哈希，明确 `approved` 后才允许发布；绝不到期自动批准。普通 DSH 没有审核权限。修改内容须作为新修订重新等待与审核；只有成功 `published` 才进入可检索索引。确定性风险初筛不替代来源、事实与污染风险审阅。

投稿写入的本版实施默认额度为每 ID 滚动 24 小时 10 次、每 IP 滚动 24 小时 30 次，非用户指定数值；状态回查不扣知识额度。原知识 ID/IP 各 5/60 秒继续有效，超限按 `429` / `Retry-After` 等待。

已发布投稿仅在 `/var/lib/dafeiyu-kb/rag/dsh_videos.json`，待审区不加入检索。LiCO 默认不加载、扫描或搜索这份目录外分区；多 P 按 BV 聚合并标明 P 与 basis，不混未审核 P。DSH 暂不按视频年龄自动淘汰，不套用原热点 H 的 15 天 TTL；共享 CPU/磁盘对实际墙钟耗时的影响未据此保证为零。
