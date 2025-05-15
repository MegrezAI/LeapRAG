#!/bin/bash

# 启动 nginx
/usr/sbin/nginx

export LD_LIBRARY_PATH=/usr/lib/x86_64-linux-gnu/

# 等待数据库准备就绪
echo "Waiting for PostgreSQL..."
while ! nc -z postgres 5432; do
  sleep 1
done
echo "PostgreSQL started"

# 运行数据库迁移
echo "Running database migrations..."
alembic upgrade head


echo "Starting progress process..."
poetry run python main.py progress &
echo "Progress process started with PID $!"

echo "Starting task process..."
poetry run python main.py task &
echo "Task process started with PID $!"

echo "Starting main process..."
poetry run python main.py
