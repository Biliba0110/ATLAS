FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    ATLAS_HOST=0.0.0.0 \
    ATLAS_PORT=4173 \
    ATLAS_DB_PATH=/app/data/atlas.db

RUN apt-get update \
    && apt-get install -y --no-install-recommends iputils-ping \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY server.py app.js i18n.js index.html styles.css atlas-logo.svg favicon.svg group-suggestion-templates.json ./
COPY agent ./agent
COPY docs ./docs

RUN useradd --create-home --shell /usr/sbin/nologin atlas \
    && mkdir -p /app/data \
    && chown -R atlas:atlas /app

USER atlas

EXPOSE 4173

VOLUME ["/app/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "from urllib.request import urlopen; urlopen('http://127.0.0.1:4173/health', timeout=3).read()"

CMD ["python", "server.py"]
