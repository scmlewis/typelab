import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

describe('static metadata', () => {
  it('ships the social metadata used by link previews', () => {
    const html = readFileSync(resolve(root, 'index.html'), 'utf8');

    expect(html).toMatch(/property="og:site_name"[^>]*content="TypeLab"/);
    expect(html).toMatch(/property="og:locale"[^>]*content="en_GB"/);
    expect(html).toMatch(/property="og:image:type"[^>]*content="image\/png"/);
    expect(html).toMatch(/name="twitter:image:alt"[^>]*content="[^"]+"/);
  });

  it('ships a 1200x630 Open Graph PNG', () => {
    const png = readFileSync(resolve(root, 'public/og.png'));

    expect(png.subarray(1, 4).toString('ascii')).toBe('PNG');
    expect(png.readUInt32BE(16)).toBe(1_200);
    expect(png.readUInt32BE(20)).toBe(630);
  });
});
