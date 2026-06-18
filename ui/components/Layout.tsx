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
        <style>{css}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}

const css = `
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:root {
  --color-bg: #0f0f0f;
  --color-surface: #1a1a1a;
  --color-border: #2e2e2e;
  --color-text: #e8e8e8;
  --color-muted: #888;
  --color-accent: #4f8ef7;
  --color-accent-hover: #6aa3ff;
  --color-checked-bg: #1c2d4a;
  --color-checked-border: #4f8ef7;
  --radius: 6px;
  --font: system-ui, -apple-system, sans-serif;
  --font-mono: ui-monospace, "Cascadia Code", monospace;
}

body {
  background: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font);
  font-size: 1rem;
  line-height: 1.5;
  min-height: 100dvh;
}

main {
  max-width: 960px;
  margin: 0 auto;
  padding: 2rem 1rem 4rem;
}

h1 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
}

p {
  color: var(--color-muted);
  margin-bottom: 1.5rem;
}

/* ── Word grid ── */

.word-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 0.5rem;
  margin-bottom: 2rem;
}

.word-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-surface);
  cursor: pointer;
  font-family: var(--font-mono);
  font-size: 0.875rem;
  transition: border-color 0.1s, background 0.1s;
  user-select: none;
}

.word-item:hover {
  border-color: var(--color-accent);
}

.word-item:has(input:checked) {
  background: var(--color-checked-bg);
  border-color: var(--color-checked-border);
  color: var(--color-accent-hover);
}

.word-item input[type="checkbox"] {
  accent-color: var(--color-accent);
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
  cursor: pointer;
}

/* ── Button ── */

button[type="submit"] {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.625rem 1.5rem;
  background: var(--color-accent);
  color: #fff;
  border: none;
  border-radius: var(--radius);
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
}

button[type="submit"]:hover {
  background: var(--color-accent-hover);
}
`;
