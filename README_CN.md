<p align="center">
  <img src="https://github.com/user-attachments/assets/a9a7271b-677a-4463-afd0-9d3c58053453" alt="LeapRAGAgent Logo" />
</p>

<h1 align="center">LeapRAG</h1>

<p align="center">
  RAG与A2A协议双引擎驱动 - 定义下一代知识型智能体
</p>

<p align="center">
  <a href="#快速开始">本地部署</a> ·
  <a href="#功能特性">功能特性</a>
</p>

<p align="center">
  <a href="./README.md"><img alt="English" src="https://img.shields.io/badge/English-d9d9d9"></a>
  <a href="./README_CN.md"><img alt="简体中文" src="https://img.shields.io/badge/简体中文-d9d9d9"></a>
</p>

LeapRAG 是一个开源平台，结合了最先进的检索增强生成（RAG）技术和谷歌的 A2A（Agent-to-Agent）协议。该平台使用户能够创建知识丰富的智能体，这些智能体能够基于您自己的数据源提供高度准确、上下文感知的回答。这些智能体自动符合 A2A 协议标准，无需额外开发即可被任何兼容 A2A 的客户端发现和使用。

## 演示视频：从模型配置到 A2A 客户端测试

以下视频展示了 LeapRAG 的完整使用流程，包括：

- 大语言模型配置
- 知识库创建
- 知识库聊天测试
- 创建 A2A 智能体
- 使用谷歌 A2A UI 客户端进行测试

**注意：** 视频中的敏感信息已进行脱敏处理。

https://github.com/user-attachments/assets/69755681-e8a7-4283-ae70-834b209e2721

## 功能特性

**1. 易用的 RAG 平台**：

- 简单直观的用户界面，无需技术背景即可快速构建高质量 RAG 应用
- 从文档上传到知识库创建的全流程可视化操作
- 预置最佳实践配置，大多数场景无需调整参数
- 所见即所得的知识库测试，实时验证效果
- 内置使用教程与提示，协助完成每一步操作
- 一键将私有知识库转化为具备 A2A 协议标准的智能体

**2. 先进的 RAG 能力**：

- 高精度文档处理和分块策略
- 支持多种嵌入模型和向量存储
- 融合语义和关键词的混合搜索
- 相关性评分和重排序，优化上下文选择
- 可配置的检索参数，平衡精确度和召回率
- 引用和来源追踪，确保回答可信度
- 幻觉检测和缓解机制

**3. 全面的知识库管理**：

- 支持多种文档格式（PDF、DOCX、TXT、CSV、Markdown 等）
- 自动元数据提取和索引
- 交互式分块可视化，支持精细化检查能力
- 智能分块预览，呈现内容关系映射
- 自定义元数据丰富，优化上下文感知检索
- 实时分块质量评估和优化工具

**4. Agent Card 生成**：

- 自动生成符合 A2A 标准的 Agent Card，可被其他 A2A 协议实现发现和使用。

**5. A2A 协议支持**：

- 完整实现谷歌的 Agent-to-Agent (A2A) 协议，实现不同框架和平台之间的智能体互操作性和协作。

**6. 多模型支持**：

- 连接您的智能体到各种开源和商业大型语言模型，包括 DeepSeek、GPT、Mistral、Llama3、Gemini 和其他兼容 OpenAI API 的模型。

**7. 后端即服务**：

- 所有功能都提供对应的 API，方便集成到您自己的业务逻辑中。

## 快速开始

> 在安装 LeapRAG 之前，请确保您的机器满足以下最低系统要求：
>
> - CPU >= 2 核
> - RAM >= 8 GB
> - Disk >= 50 GB

</br>

启动 LeapRAG 服务器的最简单方法是通过[docker compose](docker/docker-compose.yml)。在运行以下命令之前，请确保您的机器上已安装[Docker](https://docs.docker.com/get-docker/)和[Docker Compose](https://docs.docker.com/compose/install/)：

```bash
# 克隆仓库
git clone https://github.com/megrezAI/LeapRAG.git
cd LeapRAG/docker
cp .env.example.production .env
docker compose up -d
```

运行后，您可以在浏览器中访问 LeapRAG 控制面板：[http://localhost:3100](http://localhost:3100)并在注册登录后开始使用。

## 创建您的第一个 A2A 智能体

1. **配置大语言模型**：

   - 进入系统设置，添加您要使用的大语言模型
   - 配置 API 密钥和相关参数
   - 选择默认模型

2. **添加知识库**：

   - 命名您的知识库，并选择语言
   - 上传您的文档（PDF、文本文件等）

3. **创建并发布智能体**：

   - 命名您的智能体并提供描述
   - 将其与一个或多个知识库关联
   - 配置 LLM 设置和行为
   - 生成符合 A2A 标准的 Agent Card
   - 系统自动生成可访问的端点 URL，该 URL 可配置到任何支持 A2A 协议的客户端中

4. **使用您的智能体**：
   - 使用任何支持 A2A 协议的客户端与您的智能体交互
   - 配置客户端以发现您的智能体（使用上一步生成的 URL）
   - 您的智能体将从配置的知识源中提供增强的回答

## A2A 协议集成

LeapRAG 完全实现了 Google 的 A2A（Agent-to-Agent）协议，支持：

- **标准化智能体发现**：智能体以标准格式发布其能力
- **基于任务的通信**：智能体可以通过标准化的 JSON-RPC 接口请求和提供服务
- **互操作性**：任何兼容 A2A 的客户端都可以发现并使用在 LeapRAG 上创建的智能体
- **多轮对话**：支持智能体和客户端之间的复杂多轮交互

有关 A2A 协议的更多信息，请访问[谷歌 A2A 协议仓库](https://github.com/google/a2a)。

## 使用谷歌 A2A UI 客户端与 DeepSeek V3 模型

我们 fork 了谷歌的 A2A 仓库并做了一些简单的修改，主要是将模型底座从 Gemini 替换为 DeepSeek。这个修改是为了解决部分地区访问 Google 服务的限制，让更多用户能够更容易地使用客户端进行 Agent Card 测试。用户仍然可以使用 Google 官方仓库的原始客户端来发现 LeapRAG 创建的 Agent Card，我们的修改版本只是提供了一个更便捷的测试选项。

### 运行 A2A 演示客户端

1. 克隆修改后的 A2A 仓库：

   ```bash
   git clone git@github.com:MegrezAI/A2A.git
   ```

2. 进入演示 UI 目录：

   ```bash
   cd A2A/demo/ui
   ```

3. 设置您的 DeepSeek API 密钥：

   ```bash
   export DEEPSEEK_API_KEY=sk-xxx
   ```

4. 运行应用程序：

   ```bash
   uv run main.py
   ```

5. 在 http://localhost:12000 访问网页界面，开始与您的智能体交互

## 公网部署配置

如果您需要将 LeapRAG 部署到公网环境，以便其他 A2A 客户端能够发现和调用您的智能体，您需要进行以下配置：

### Nginx 公网配置

1. 进入 docker 目录并复制生产环境配置文件：

```bash
cd LeapRAG/docker
cp .env.example.production .env
```

2. 修改 `.env` 文件中的以下配置项：

   - `SERVICE_API_URL_BASE`：设置为您的完整域名地址

     - HTTP 模式下：`http://your-domain.com/api`
     - HTTPS 模式下：`https://your-domain.com/api`

   - `NGINX_SERVER_NAME`：设置为您的域名（例如：`your-domain.com`）

   - **标准 HTTP 配置**：

     - `EXPOSE_NGINX_PORT`：建议修改为 `80`（标准 HTTP 端口）

   - **启用 HTTPS 配置**：

     - `NGINX_HTTPS_ENABLED=true`
     - `EXPOSE_NGINX_SSL_PORT`：建议修改为 `443`（标准 HTTPS 端口）
     - `NGINX_SSL_CERT_FILENAME`：SSL 证书文件名（默认为`leapai.crt`，如果使用不同名称，请相应修改）
     - `NGINX_SSL_CERT_KEY_FILENAME`：SSL 证书密钥文件名（默认为`leapai.key`，如果使用不同名称，请相应修改）
     - `NGINX_SSL_PROTOCOLS`：SSL 协议设置（默认值 `TLSv1.1 TLSv1.2 TLSv1.3` 通常无需修改）

   - 将您的 SSL 证书和密钥文件放在 `nginx/ssl` 目录下，并确保文件名与上面的配置相匹配：
     - 证书文件：`nginx/ssl/leapai.crt`（或您在配置中指定的名称）
     - 密钥文件：`nginx/ssl/leapai.key`（或您在配置中指定的名称）

3. 重要：如果您的服务器防火墙开启，请确保开放相应端口（80/443）

4. 启动所有服务：

```bash
docker compose up -d
```

成功配置后，您应该能够通过以下方式访问 LeapRAG：

- HTTP 模式：`http://your-domain.com`
- HTTPS 模式：`https://your-domain.com`

### 配置智能体公网访问地址

完成 Nginx 配置并确认服务正常运行后，您需要配置智能体的公网访问地址，以便其他 A2A 客户端能够发现和访问您的智能体：

1. **智能体本地 URL**：

   当您创建智能体后，系统会自动生成一个默认的智能体服务地址，格式基于`SERVICE_API_URL_BASE` 配置，通常为 `http://{SERVICE_API_URL_BASE}/rag/{agent_id}`

2. **个性化智能体 URL**：

   在智能体配置页面，如有需要，可以在"个性化智能体 URL"中填写自定义的智能体公网访问地址。
   通常，该地址为您通过 Nginx 反向代理所配置的智能体公网域名。

3. **验证智能体公网可访问性**：

   - 配置保存后，可通过浏览器直接访问您配置的公网 URL，确认能够获取正确的 Agent Card 信息

   - 使用 A2A 客户端尝试连接此地址，验证智能体是否可被正确发现和调用

通过正确配置个性化智能体 URL，您的智能体将可以在公网环境中被任何支持 A2A 协议的客户端发现和使用。

## 社区与联系

- GitHub Issues：报告 bug 和功能建议

## 致谢

我们感谢 [RagFlow](https://github.com/infiniflow/ragflow) 及其在检索增强生成方面的杰出工作，它启发了 LeapRAG 中部分实现的开发。

## 许可证

本项目采用[Apache 2.0 许可证](LICENSE)。
