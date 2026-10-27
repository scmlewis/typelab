import { describe, expect, it } from 'vitest';

import { formatQuoteAttribution, getQuoteById, pickQuote, QUOTES } from '@/engine/content/quotes';

describe('quote library', () => {
  it('publishes unique ids with full attribution', () => {
    const ids = new Set(QUOTES.map((quote) => quote.id));

    expect(ids.size).toBe(QUOTES.length);
    expect(QUOTES.length).toBeGreaterThanOrEqual(20);

    for (const quote of QUOTES) {
      expect(quote.text.trim().split(/\s+/).length).toBeGreaterThanOrEqual(8);
      expect(quote.author.trim().length).toBeGreaterThan(0);
      expect(quote.source.trim().length).toBeGreaterThan(0);
    }
  });

  it('only uses punctuation a keyboard can type', () => {
    for (const quote of QUOTES) {
      expect(quote.text).not.toMatch(/[\u2013\u2014\u2018\u2019\u201c\u201d]/);
    }
  });

  it('finds a quote by id and rejects unknown ids', () => {
    const first = QUOTES[0];

    expect(first).toBeDefined();
    expect(getQuoteById(first!.id)).toEqual(first);
    expect(getQuoteById('not-a-quote')).toBeNull();
  });

  it('picks the same quote for the same seed', () => {
    expect(pickQuote(42)).toEqual(pickQuote(42));
  });

  it('never repeats the excluded quote when another exists', () => {
    for (let seed = 0; seed < 20; seed += 1) {
      const first = pickQuote(seed);

      expect(pickQuote(seed, first.id).id).not.toBe(first.id);
    }
  });

  it('formats attribution for display', () => {
    expect(formatQuoteAttribution(QUOTES[0]!)).toBe(`${QUOTES[0]!.author}, ${QUOTES[0]!.source}`);
  });
});
