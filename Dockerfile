FROM denoland/deno:debian-2.9.0 AS dependencies

WORKDIR /app

COPY deno.json deno.lock deps.ts ./
RUN deno cache --frozen deps.ts

FROM dependencies AS build

COPY . .
RUN deno cache --frozen main.ts drizzle.config.ts

FROM denoland/deno:debian-2.9.0 AS runtime

WORKDIR /app

COPY --link --from=build /deno-dir /deno-dir
COPY --link --from=build /app /app

ENV DENO_DIR=/deno-dir
ENV PORT=8000

EXPOSE 8000

RUN mkdir -p /data/kv && chown -R deno:deno /data/kv

USER deno

CMD ["run", "--frozen", "--unstable-kv", "--allow-net=0.0.0.0:8000,postgres:5432", "--allow-env", "--allow-read=/app/static,/data/kv", "--allow-write=/data/kv", "main.ts"]
