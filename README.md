<p align="center">
  <img src="docs/assets/deepseek-chibi-apprentice.png" alt="大肥鱼的蓝发鲸鱼娘 Q 版形象" width="240">
</p>

# 大肥鱼知识库 · Fat Whale Library

**更多、更好玩、更抽象。先读梗概，再决定看什么。**

为 DeepSeek Harness（DSH）机器人提供共享的视频知识：按主题寻找已有材料，或按原视频 BV 精确读取概述、关键词和可用的分时段摘要。

[打开完整说明页](https://cleverwing.github.io/fat-whale-library/) · [当前在线服务](https://livecompanion.duckdns.org/dafeiyu) · [下载 DSH 插件包](https://livecompanion.duckdns.org/dafeiyu/connect/dafeiyu-dsh.zip)

本仓库发布静态说明页、接入文档和 JSON 示例。知识库在服务端集中维护与更新，使用者无需下载本地知识库。上方 GitHub Pages 入口是否已可访问，以实际部署状态为准；也可打开仓库中的 [说明页源文件](docs/index.html)。

## 接入与使用

1. [下载插件包](https://livecompanion.duckdns.org/dafeiyu/connect/dafeiyu-dsh.zip)，按 [DSH 安装说明](dsh/README.md) 添加到正在使用的 profile。
2. 插件首次连接自动领取并保存安装 ID，后续自动携带；不用邮箱、MAC 或手工填写 ID。DeepSeek 模型配置由自己的 DSH 环境管理。
3. 用自然语言描述想了解的内容，或提供原视频 BV。需要更多细节时，机器人可以精确读取命中视频的已有资料。

知识查询工具为 `dafeiyu_find_videos` 和 `dafeiyu_get_video`；远程 MCP 另有投稿与回执查询工具。插件的原生 `dafeiyu_usage` 可查看本安装的用量与提醒。完整字段见 [请求与返回说明](docs/request-format.md)。

主服务器知识查询免费，每个安装 ID 和每个来源 IP 分别实行滚动 60 秒最多 5 次知识请求的共享额度；收到限流后应等待。模型、实际观看及其他第三方服务费用由各自运行环境决定。

概述与分段资料帮助机器人理解和选片。标记为 `source_ai_summary_unverified` 的材料是采集的 AI 摘要，可能有错误；源分段完整返回也不代表覆盖整片或经过独立事实核验。实际播放、观看及分享由机器人自己的工具和用户授权决定。

## 一起贡献视频知识

欢迎按统一格式提交原视频 BV、内容梗概及来源依据。投稿先进入独立待审区，接收至少 24 小时且由独立管理员明确审核批准后才可发布；满 24 小时不会自动批准，接收也不等于已入库。

[投稿格式与审核规则](docs/contribution-format.md) · [JSON 示例](docs/contribution.example.json) · [JSON Schema](docs/contribution.schema.json)

## 友情链接

[DSH B站内容学习插件 · dsh-bili-humanism](https://github.com/InariNGT-Ofiicial/dsh-bili-humanism) 从视频文字与抽样画面整理个人阅读记录；大肥鱼侧重共享已收录的 BV、梗概和可用分段资料，两者方向互补。具体能力与配置以各自项目为准。

[观看项目介绍](https://www.bilibili.com/video/BV1fxni6XEwD/)

## 图像来源与许可

鲸鱼娘形象沿用上善无形原角色、ZipZipPipe 二次设计及 ApprenTice 改编图；说明页敬礼图为基于该形象生成的派生图。保留 [图像署名与 CC BY-NC-SA 4.0 许可说明](docs/assets/THIRD_PARTY_NOTICES.md) 和 [来源视频](https://www.bilibili.com/video/BV1zXHe6nESu/)。本项目与 DeepSeek 或所链接社区项目不存在官方背书关系。

图像、第三方视频内容及其他材料分别保留各自权利范围；本说明页不替它们另行授予许可。
