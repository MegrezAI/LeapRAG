# Docker 环境设置指南

## 环境配置

### 本地开发环境

1. 复制开发环境配置文件：

```bash
cp .env.example .env
```

2. 启动基础服务（PostgreSQL、Redis、MinIO 和 Elasticsearch）：

```bash
docker compose -f docker-compose-base.yml up -d
```

3. 进入 backend 目录并启动项目：

```bash
cd ../backend

poetry install

poetry run python download_deps.py

poetry run python migrations.py db upgrade

poetry run python app.py
```

### 生产环境

1. 进入 backend 目录

```bash
cd backend
```

```bash
docker build -f Dockerfile.deps -t leapai-deps .
```

2. 进入 docker 目录

```bash
cd docker
```

3. 复制生产环境配置文件：

```bash
cp .env.example.production .env
```

4. 根据实际环境修改 `.env` 中的以下配置：

   - `SERVICE_API_URL_BASE`：设置为您的完整域名地址，例如：
     - 如果使用 HTTP：`http://your-domain.com/api`
     - 如果使用 HTTPS：`https://your-domain.com/api`
   - `EXPOSE_NGINX_PORT`：对外暴露的 Nginx HTTP 端口（默认 3100）
   - 如果需要启用 HTTPS：
     - `NGINX_HTTPS_ENABLED=true`
     - `EXPOSE_NGINX_SSL_PORT`：对外暴露的 HTTPS 端口（默认 8443）
     - 将 SSL 证书放在 `nginx/ssl` 目录下

5. 构建依赖并启动所有服务：

```bash
docker compose up -d
```

6. 重新构建并启动 server 或 web 镜像（如果有变动）

```bash
docker compose up --build -d leapai-server
docker compose up --build -d leapai-web
```

7. 查看 log

```bash
docker logs -f leapai-server
```

## 服务说明

启动后，以下服务将在以下端口可用：

- 前端服务：http://localhost:3100
- 后端服务：http://localhost:5001
- MinIO：http://localhost:9000
- PostgreSQL：localhost:5432
- Redis：localhost:6379
- Elasticsearch：http://localhost:9200
- Nginx：http://localhost:{EXPOSE_NGINX_PORT}
