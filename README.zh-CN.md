<div align="center">
  <img src="docs/readme/hero.svg" width="100%" alt="Content Publisher workflow overview">
  <h1>Content Publisher</h1>
  <p><strong>本地整理草稿，核对平台能力，再明确发布。</strong></p>
  <p><a href="LICENSE"><img alt="License: Apache-2.0" src="https://img.shields.io/badge/License-Apache--2.0-d99536?style=flat-square"></a> <a href="docs/readme/validation.md"><img alt="Validation notes" src="https://img.shields.io/badge/Validation-repository%20checks-547ac4?style=flat-square"></a></p>
  <p><a href="#overview">项目亮点</a> · <a href="#quick-start">快速开始</a> · <a href="#workflow">工作流</a> · <a href="#validation">验证</a> · <a href="#documentation">文档</a></p>
  <p><a href="README.md">English</a> · <a href="README.zh-CN.md">简体中文</a></p>
</div>

---

<a id="overview"></a>
## 项目亮点

本地内容运营面板，包含草稿、素材、平台检查、发布包和账号适配器。先从 dry-run 与人工交接开始。

| 能力 | 内容 |
| :--- | :--- |
| **内容工作区** | 文字、图片、视频草稿及平台规则。 |
| **本地账号** | 可选 localhost OAuth 服务、MongoDB 和加密 token 存储。 |
| **明确适配边界** | 真实 API 路径与人工审核发布包各有前提。 |

### 本地演示

![content-publisher local demonstration](docs/readme/demo.jpg)

*本地示例草稿，本次未实际发帖。*

<a id="quick-start"></a>
## 快速开始

```bash
git clone https://github.com/eust-w/content-publisher.git
cd content-publisher
# Node.js 24 is recommended.
npm ci
npm run dev
npm run publish:dry-run -- --draft draft-001
```

<a id="workflow"></a>
## 工作流

```text
DRAFT → VALIDATE → HANDOFF
```

```bash
# Optional account service:
# Set CONTENT_PUBLISHER_MONGODB_URI and LOCAL_FRONTEND_ORIGIN in local env.
npm run auth:server
npm run accounts:list
```

<a id="validation"></a>
## 验证

```bash
npm test
npm run lint
npm run build
npm run publish:dry-run -- --draft draft-001
```

运行环境与已执行结果见 [validation notes](docs/readme/validation.md).

| 项目 | 当前边界 |
| :--- | :--- |
| YouTube / X / 抖音 | API 适配器需要应用批准、OAuth、配额和平台权限。 |
| Bilibili / 小红书 | Bilibili 使用获准的交接 endpoint；小红书先生成手工发布包。 |
| 本地控制面 | 健康响应只包含状态；浏览器 origin 必须匹配 LOCAL_FRONTEND_ORIGIN。 |

Node 26 的 jsdom 测试需使用 `NODE_OPTIONS=--no-experimental-webstorage npm test`；推荐 Node 24。

<a id="documentation"></a>
## 文档

- [Account setup / 账号配置](docs/account-testing.md)
- [Auth server / 认证服务](server/authServer.ts)
- [Platform adapters / 平台适配](src/)

## 许可证与来源

原创代码和新增演示资源采用 [Apache-2.0](LICENSE). 第三方代码、模型、数据和外部资源保留各自许可，详见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
