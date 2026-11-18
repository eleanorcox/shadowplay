import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Every screencast GIF is shown on the screencasts page, and everything it shows exists.
describe('the screencasts page', () => {
  const page = readFileSync('docs/screencasts.md', 'utf8');
  const gifs = readdirSync('docs/screencasts').filter((f) => f.endsWith('.gif'));

  it('has at least one GIF', () => {
    expect(gifs.length).toBeGreaterThan(0);
  });

  it.each(gifs)('shows %s', (gif) => {
    expect(page).toContain(`screencasts/${gif}`);
  });

  it('shows only pictures that exist', () => {
    for (const [, path] of page.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)) expect(existsSync(`docs/${path}`)).toBe(true);
  });
});
