import { getWordList } from '@/engine/content/word-lists';
import { createRandom } from '@/engine/random';
import type { Prompt, TestConfig } from '@/engine/types';
import { GENERATOR_VERSION } from '@/engine/versions';

export const TIMED_PROMPT_WORD_COUNT = 500;

const SENTENCE_ENDINGS = ['.', '?', '!'] as const;
const INLINE_PUNCTUATION = [',', ';', ':'] as const;
const PUNCTUATION_CHANCE = 0.22;
const SENTENCE_ENDING_CHANCE = 0.12;
const NUMBER_CHANCE = 0.08;
const MAX_NUMBER = 10_000;

export interface PromptOptions {
  quoteText?: string;
}

export function generatePrompt(config: TestConfig, options: PromptOptions = {}): Prompt {
  const random = createRandom(config.seed);

  switch (config.mode) {
    case 'timed': {
      const words = pickWords(getWordList(config.vocabulary), TIMED_PROMPT_WORD_COUNT, random);
      return buildPrompt(applyModifiers(words, config, random));
    }
    case 'words': {
      const words = pickWords(getWordList(config.vocabulary), config.wordCount, random);
      return buildPrompt(applyModifiers(words, config, random));
    }
    case 'custom':
      return createPromptFromText(config.customText);
    case 'quote': {
      if (options.quoteText === undefined) {
        throw new Error('Quote text is required to generate a quote prompt.');
      }
      return createPromptFromText(options.quoteText);
    }
  }
}

/**
 * Typing is word-based, so arbitrary whitespace is reduced to single spaces.
 * Punctuation, casing, and word spelling are left untouched.
 */
export function normalizeCustomText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function createPromptFromText(text: string): Prompt {
  const normalized = normalizeCustomText(text);
  const words = normalized.length === 0 ? [] : normalized.split(' ');

  if (words.length === 0) {
    throw new Error('Prompt text cannot be empty.');
  }

  return buildPrompt(words);
}

function buildPrompt(words: readonly string[]): Prompt {
  const text = words.join(' ');

  return {
    id: `${GENERATOR_VERSION}:${hashText(text)}`,
    text,
    words: [...words],
    generatorVersion: GENERATOR_VERSION,
  };
}

function pickWords(list: readonly string[], count: number, random: () => number): string[] {
  if (list.length === 0) {
    throw new Error('Cannot generate a prompt from an empty word list.');
  }

  const words: string[] = [];

  for (let index = 0; index < count; index += 1) {
    const word = list[Math.floor(random() * list.length)];

    if (word === undefined) {
      throw new Error('Word list index was out of range.');
    }

    words.push(word);
  }

  return words;
}

function applyModifiers(
  words: readonly string[],
  config: TestConfig,
  random: () => number,
): string[] {
  if (!config.punctuation && !config.numbers) {
    return [...words];
  }

  let capitalizeNext = config.punctuation;

  return words.map((word) => {
    if (config.numbers && random() < NUMBER_CHANCE) {
      return String(Math.floor(random() * MAX_NUMBER));
    }

    let token = word;

    if (capitalizeNext) {
      token = capitalize(token);
      capitalizeNext = false;
    }

    if (config.punctuation) {
      const roll = random();

      if (roll < SENTENCE_ENDING_CHANCE) {
        token += randomItem(SENTENCE_ENDINGS, random);
        capitalizeNext = true;
      } else if (roll < PUNCTUATION_CHANCE) {
        token += randomItem(INLINE_PUNCTUATION, random);
      }
    }

    return token;
  });
}

function capitalize(word: string): string {
  const first = word.charAt(0);
  return first.length === 0 ? word : `${first.toUpperCase()}${word.slice(1)}`;
}

function randomItem<T>(items: readonly T[], random: () => number): T {
  const item = items[Math.floor(random() * items.length)];

  if (item === undefined) {
    throw new Error('Cannot choose from an empty list.');
  }

  return item;
}

function hashText(text: string): string {
  let hash = 0x811c9dc5;

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
}
