# backend 开发

## 设置开发环境

1. 复制 docker/.env.example 到 docker/.env

```bash
cp docker/.env.example docker/.env
```

2. 安装 poetry
3. 进入 backend 目录

```bash
cd backend
```

4. 安装依赖

```bash
poetry install
```

5. 下载其他依赖

```bash
poetry run python download_deps.py
```

6. 启动依赖服务
   Docker Compose 启动依赖的服务（MinIO, Elasticsearch, Redis, Postgresql and Infinity）：

```bash
docker compose -f ../docker/docker-compose-base.yml up -d
```

端口配置：参见 docker/.env 和 service_conf.yaml 文件

7. 数据库初始化和升级
   首次创建 database scheme 时，需运行

```bash
alembic init -t async alembic
alembic revision --autogenerate -m "Initial migration"
```

创建 migration 脚本后，运行

```bash
alembic upgrade head
```

创建本地数据库。

修改了 model 后，需要运行

```bash
alembic revision --autogenerate -m "Upgrade model"
```

从代码库更新 migration 脚本，并运行

```bash
alembic upgrade head
```

升级本地数据库。

8. 复制.env.example 文件为.env 文件

```bash
cp .env.example .env
```

9. 运行项目

```bash
poetry run python main.py
poetry run python main.py progress
poetry run python main.py task
```

## 认证机制

### 登录

通过/api/console/account/login 接口登录后，获得 access_token 和 refresh_token。access_token 用于访问需要认证的接口，refresh_token 用于刷新 access_token。
access_token 和 refresh_token 的过期时间分别为 1 小时和 7 天。

### 刷新 access_token

通过/api/console/account/refresh-token 接口刷新 access_token。
刷新 token 时，需要提供 refresh_token。

### 登出

通过/api/console/account/logout 接口登出。登出后，refresh_token 都将失效。

### 访问需要认证的接口

在请求头中添加 Authorization 字段，值为"Bearer access_token"。

## restful api 开发规范

1. restful API 统一继承 libs.base_resource.BaseResource
2. post 请求尽量提供 request model，并使用@api.expect()装饰器
3. 尽量使用@api.marshal_with()装饰器提供 response model
