<p align="center">
  <img src="docs/assets/deepseek-chibi-apprentice.png" alt="大肥鱼的蓝发鲸鱼娘 Q 版形象" width="240">
</p>

# 大肥鱼知识库 · Fat Whale Library

**更多、更好玩、更抽象。先读梗概，再决定看什么。**

为 DeepSeek Harness（DSH）机器人提供共享的视频知识：按主题寻找已有材料，或按原视频 BV 精确读取概述、关键词和可用的分时段摘要。

[打开完整说明页](https://cleverwing.github.io/fat-whale-library/) · [当前在线服务](https://livecompanion.duckdns.org/dafeiyu) · [下载 DSH 插件包](https://github.com/CleverWing/fat-whale-library/releases/download/dsh-v0.3.1/dafeiyu-dsh-0.3.1.zip)

本仓库提供 **DSH 插件完整源码、可直接安装的版本化 ZIP 和安装说明**。插件代码位于 [dsh/](dsh/)，安装包与 SHA-256 校验文件见 [Release v0.3.1](https://github.com/CleverWing/fat-whale-library/releases/tag/dsh-v0.3.1)。插件使用原生 JavaScript，源码即可运行，无需另行编译。知识库在服务端集中维护与更新，用户不需要下载本地知识库。

## 下载与安装

下载 [dafeiyu-dsh-0.3.1.zip](https://github.com/CleverWing/fat-whale-library/releases/download/dsh-v0.3.1/dafeiyu-dsh-0.3.1.zip)，解压到固定目录。Windows 桌面版用应用自带的 CLI 安装：

```powershell
& "$env:LOCALAPPDATA\Programs\DeepSeek Harness\resources\runtime\cli\bin\dsh.cmd" plugin --profile desktop add 'C:\DSH-plugins\dafeiyu-dsh'
```

将路径换成自己的解压目录（其中应有 `package.json`），然后重启对应 profile。安装使用本地目录链接，请保留该目录。独立普通 CLI 使用自己的非 `desktop` profile，见 [完整安装说明](dsh/README.md)。兼容声明为 DSH `>=0.2.1-rc.3 <0.3.0`，已验证运行时为 `0.2.1-rc.3`。

从源码安装时，将安装路径指向本地仓库的 `dsh` 子目录。仓库根目录不是插件包。

## 接入与使用

1. [下载插件包](https://github.com/CleverWing/fat-whale-library/releases/download/dsh-v0.3.1/dafeiyu-dsh-0.3.1.zip)，按 [DSH 安装说明](dsh/README.md) 添加到正在使用的 profile。
2. 插件首次连接自动领取并保存安装 ID，后续自动携带；不用邮箱、MAC 或手工填写 ID。DeepSeek 模型配置由自己的 DSH 环境管理。
3. 用自然语言描述想了解的内容，或提供原视频 BV。需要更多细节时，机器人可以精确读取命中视频的已有资料。

知识查询工具为 `dafeiyu_find_videos` 和 `dafeiyu_get_video`；远程 MCP 另有投稿与回执查询工具。插件的原生 `dafeiyu_usage` 可查看本安装的用量与提醒。完整字段见 [请求与返回说明](docs/request-format.md)。

主服务器知识查询免费，每个安装 ID 和每个来源 IP 分别实行滚动 60 秒最多 5 次知识请求的共享额度；收到限流后应等待。模型、实际观看及其他第三方服务费用由各自运行环境决定。

概述与分段资料帮助机器人理解和选片。标记为 `source_ai_summary_unverified` 的材料是采集的 AI 摘要，可能有错误；源分段完整返回也不代表覆盖整片或经过独立事实核验。实际播放、观看及分享由机器人自己的工具和用户授权决定。

## 一起贡献视频知识

欢迎按统一格式提交原视频 BV、内容梗概及来源依据。投稿先进入独立待审区，接收至少 24 小时且由独立管理员明确审核批准后才可发布；满 24 小时不会自动批准，接收也不等于已入库。

[投稿格式与审核规则](docs/contribution-format.md) · [JSON 示例](docs/contribution.example.json) · [JSON Schema](docs/contribution.schema.json)

## 从源码生成安装包

本项目没有 TypeScript 转译或原生编译步骤；版本化 ZIP 包含运行所需 JavaScript、配置、说明和许可。使用 Python 3.10+ 在仓库根目录执行：

```powershell
python scripts/package_release.py --output-dir release-output
```

脚本按明确白名单打包 `dsh` 中的 7 个文件，输出 ZIP 和 `SHA256SUMS`。使用新的输出目录保留旧产物。Windows 可用 `Get-FileHash .\release-output\dafeiyu-dsh-0.3.1.zip -Algorithm SHA256` 核对校验值。

| 文件 | 用途 |
| --- | --- |
| `dsh/index.js` | 官方 DSH 插件入口、安装身份注册与 MCP 接入 |
| `dsh/identity.mjs` | 安装凭据记录与服务地址校验 |
| `dsh/status.mjs` | 本机只读身份状态命令 |
| `dsh/cordis.patch.yml`、`dsh/package.json` | 官方 bundle 配置、版本与依赖声明 |
| `scripts/package_release.py` | 从上述源码生成安装 ZIP |
| `docs/` | GitHub Pages 说明页、请求与投稿格式 |

源代码保留现有 [MIT 许可](LICENSE)。图像适用下面单独列出的许可。

## 友情链接

[DSH B站内容学习插件 · dsh-bili-humanism](https://github.com/InariNGT-Ofiicial/dsh-bili-humanism) 从视频文字与抽样画面整理个人阅读记录；大肥鱼侧重共享已收录的 BV、梗概和可用分段资料，两者方向互补。具体能力与配置以各自项目为准。

[观看项目介绍](https://www.bilibili.com/video/BV1fxni6XEwD/)

## 图像来源与许可

鲸鱼娘形象沿用上善无形原角色、ZipZipPipe 二次设计及 ApprenTice 改编图；说明页敬礼图为基于该形象生成的派生图。保留 [图像署名与 CC BY-NC-SA 4.0 许可说明](docs/assets/THIRD_PARTY_NOTICES.md) 和 [来源视频](https://www.bilibili.com/video/BV1zXHe6nESu/)。本项目与 DeepSeek 或所链接社区项目不存在官方背书关系。

图像、第三方视频内容及其他材料分别保留各自权利范围；本说明页不替它们另行授予许可。
