# base stage
FROM python:3.11-slim AS base
USER root
SHELL ["/bin/bash", "-c"]

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PIP_DEFAULT_TIMEOUT=100
ENV POETRY_HTTP_TIMEOUT=100
ENV POETRY_INSTALLER_MAX_WORKERS=10
ENV PATH="/root/.local/bin:$PATH"


RUN if [ "$NEED_MIRROR" == "1" ]; then \
    sed -i 's|http://deb.debian.org|https://mirrors.tuna.tsinghua.edu.cn|g' /etc/apt/sources.list; \
    fi && \
    apt update && \
    apt install -y \
    build-essential \
    libgmp-dev \
    libmpfr-dev \
    libmpc-dev \
    zlib1g-dev \
    libssl-dev \
    libffi-dev \
    libpq-dev \
    libxml2-dev \
    libxslt1-dev \
    python3-setuptools \
    python3-wheel \
    libmagic1 \
    libsm6 \
    libxext6 \
    libxrender1 \
    libgomp1 \
    libglib2.0-0 \
    libglx-mesa0 \
    libgl1 \
    pkg-config \
    libicu-dev \
    libgdiplus \
    default-jdk \
    libatk-bridge2.0-0 \
    libgtk-4-1 \
    libnss3 \
    xdg-utils \
    libgbm-dev \
    libjemalloc-dev \
    nginx \
    unzip \
    curl \
    wget \
    git \
    vim \
    less \
    netcat-traditional && \
    rm -rf /var/lib/apt/lists/*


RUN curl -sSL https://install.python-poetry.org | python3 - && \
    poetry config installer.max-workers 10 && \
    if [ "$NEED_MIRROR" == "1" ]; then \
    poetry config repositories.tuna https://pypi.tuna.tsinghua.edu.cn/simple && \
    poetry config repositories.default https://pypi.tuna.tsinghua.edu.cn/simple; \
    fi

# builder stage
FROM base AS builder

WORKDIR /app

RUN mkdir -p /app/rag/res/deepdoc /root/.leaprag

COPY pyproject.toml poetry.lock ./
COPY poetry.toml ./


RUN --mount=type=bind,from=leapai-deps,source=/huggingface.co,target=/huggingface.co \
    cp -r /huggingface.co /app/
RUN --mount=type=bind,from=leapai-deps,source=/nltk_data,target=/nltk_data \
    mkdir -p /app/nltk_data && \
    cp -r /nltk_data/* /app/nltk_data/
RUN --mount=type=bind,from=leapai-deps,source=/,target=/deps \
    cp /deps/*.deb /deps/*.jar* /deps/chrome-* /deps/chromedriver-* /app/ && \
    cp /deps/cl100k_base.tiktoken /app/9b5ad71b2ce5302211f9c61530b329a4922fc6a4




RUN --mount=type=cache,target=/root/.cache/pypoetry \
    export POETRY_REQUESTS_TIMEOUT=120 && \
    export POETRY_INSTALLER_PARALLEL=false && \
    export POETRY_NO_INTERACTION=1 && \
    poetry install --no-interaction --no-ansi


FROM base AS production

WORKDIR /app

COPY --from=builder /app/.venv /app/.venv

ENV VIRTUAL_ENV=/app/.venv
ENV PATH="$VIRTUAL_ENV/bin:$PATH"
ENV PYTHONDONTWRITEBYTECODE=1 DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=1


COPY --from=builder /app/huggingface.co /app/huggingface.co
COPY --from=builder /app/nltk_data /app/nltk_data
COPY --from=builder /app/*.deb /app/

RUN if [ "$(uname -m)" = "x86_64" ]; then \
    dpkg -i /app/libssl1.1_1.1.1f-1ubuntu2_amd64.deb || apt-get install -f -y; \
    elif [ "$(uname -m)" = "aarch64" ]; then \
    dpkg -i /app/libssl1.1_1.1.1f-1ubuntu2_arm64.deb || apt-get install -f -y; \
    fi

COPY --from=builder /app/*.jar* /app/
COPY --from=builder /app/9b5ad71b2ce5302211f9c61530b329a4922fc6a4 /app/
COPY --from=builder /app/chrome-* /app/
COPY --from=builder /app/chromedriver-* /app/
COPY --from=builder /app/huggingface.co/InfiniFlow/huqie/huqie.txt.trie /app/rag/res/
COPY --from=builder /app/huggingface.co/InfiniFlow/text_concat_xgb_v1.0 /app/rag/res/deepdoc/
COPY --from=builder /app/huggingface.co/InfiniFlow/deepdoc /app/rag/res/deepdoc/
COPY --from=builder /app/huggingface.co/BAAI /root/.leaprag/
COPY . .


RUN mkdir -p /app/conf 


ENV FLASK_APP=app.py
ENV FLASK_ENV=production
ENV PYTHONPATH=/app
ENV LD_LIBRARY_PATH=/usr/lib/x86_64-linux-gnu/
ENV NLTK_DATA=/app/nltk_data


COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh


EXPOSE 5001


ENTRYPOINT ["/app/entrypoint.sh"]
