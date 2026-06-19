import type { Child } from "hono/jsx";

type LayoutProps = {
  children: Child;
  title: string;
};

export function Layout({ children, title }: LayoutProps) {
  return (
    <html lang="en" data-theme="dark">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="description"
          content="ELX vocabulary assessment application"
        />
        <title>{title}</title>
        <link rel="stylesheet" href="/static/pico.min.css" />
        <link rel="stylesheet" href="/static/app.css" />
      </head>
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
