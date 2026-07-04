FROM denoland/deno:debian-2.9.0 AS dependencies

WORKDIR /app

COPY deno.json deno.lock ./
RUN deno install --frozen

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

USER deno

CMD ["run", "--frozen", "--allow-net=0.0.0.0:8000,postgres:5432", "--allow-env", "--allow-read=/app/static,/app/.env", "--allow-write=/app/.data", "main.ts"]
