import type { Child } from "hono/jsx";

type LayoutProps = {
  children: Child;
  title: string;
};

export function Layout({ children, title }: LayoutProps) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="description"
          content="ELX vocabulary assessment application"
        />
        <title>{title}</title>
      </head>
      <body>{children}</body>
    </html>
  );
}
