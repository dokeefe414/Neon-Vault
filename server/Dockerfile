FROM node:22-alpine AS trivia
WORKDIR /src
COPY package.json ./
COPY src/data ./src/data
COPY scripts/export-trivia.mjs ./scripts/export-trivia.mjs
RUN node scripts/export-trivia.mjs

FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY server/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt && useradd --create-home appuser
COPY server/app ./app
COPY --from=trivia /src/server/app/trivia_bank.json ./app/trivia_bank.json
USER appuser
EXPOSE 8000
CMD ["uvicorn","app.main:app","--host","0.0.0.0","--port","8000","--proxy-headers","--forwarded-allow-ips","127.0.0.1"]
