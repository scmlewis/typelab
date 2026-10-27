import { ENGLISH_1K } from '@/engine/content/english-1k';
import { ENGLISH_200 } from '@/engine/content/english-200';
import type { Vocabulary } from '@/engine/types';

export const WORD_LISTS: Record<Vocabulary, readonly string[]> = {
  'english-200': ENGLISH_200,
  'english-1k': ENGLISH_1K,
};

export function getWordList(vocabulary: Vocabulary): readonly string[] {
  return WORD_LISTS[vocabulary];
}
