import { getCategoryKey, getComparableCategoryKey } from '@/engine/config';
import { isDegenerateResult } from '@/engine/scoring';
import type { Language, TestMode, TestResult } from '@/engine/types';
import type { ImportSummary } from '@/features/history/backup';
import { getTypelabDatabase } from '@/features/history/typelabDatabase';
import type { TypelabDatabase } from '@/features/history/typelabDatabase';

export const DEFAULT_HISTORY_LIMIT = 50;
export const MAX_HISTORY_LIMIT = 200;

export interface HistoryQuery {
  limit?: number;
  offset?: number;
  includeExcluded?: boolean;
  testMode?: TestMode;
  language?: Language;
  /** Inclusive ISO date bound. */
  from?: string;
  /** Inclusive ISO date bound. */
  to?: string;
}

export interface HistoryPage {
  items: TestResult[];
  total: number;
  hasMore: boolean;
}

export class LocalResultRepository {
  private readonly db: TypelabDatabase;

  constructor(db: TypelabDatabase) {
    this.db = db;
  }

  async save(result: TestResult): Promise<void> {
    try {
      await this.db.results.add(result);
    } catch (error) {
      // StrictMode effects and repeated imports can retry the same record.
      // Identical ids are a no-op; a different id for a taken clientTestId is
      // still a real conflict.
      const existing = await this.db.results
        .where('clientTestId')
        .equals(result.clientTestId)
        .first()
        .catch(() => undefined);

      if (existing?.id === result.id) {
        return;
      }

      throw error;
    }
  }

  async get(id: string): Promise<TestResult | null> {
    const result = await this.db.results.get(id);

    return result ?? null;
  }

  /** Every result, newest first. Used by backup export, not the paged UI. */
  getAll(): Promise<TestResult[]> {
    return this.db.results.orderBy('completedAt').reverse().toArray();
  }

  async list(query: HistoryQuery = {}): Promise<HistoryPage> {
    const limit = Math.min(Math.max(query.limit ?? DEFAULT_HISTORY_LIMIT, 1), MAX_HISTORY_LIMIT);
    const offset = Math.max(query.offset ?? 0, 0);
    const includeExcluded = query.includeExcluded ?? false;

    const collection = this.db.results
      .orderBy('completedAt')
      .reverse()
      .filter((result) => {
        if (!includeExcluded && isDegenerateResult(result)) {
          return false;
        }

        if (query.testMode !== undefined && result.testMode !== query.testMode) {
          return false;
        }

        if (query.language !== undefined && result.language !== query.language) {
          return false;
        }

        if (query.from !== undefined && result.completedAt < query.from) {
          return false;
        }

        if (query.to !== undefined && result.completedAt > query.to) {
          return false;
        }

        return true;
      });

    const total = await collection.count();
    const items = await collection.offset(offset).limit(limit).toArray();

    return {
      items,
      total,
      hasMore: offset + items.length < total,
    };
  }

  /**
   * Best net WPM inside one comparable category. Degenerate runs and custom
   * text never compete; ties break on accuracy, then on the earlier run.
   */
  async getPersonalBest(categoryKey: string): Promise<TestResult | null> {
    const mode = categoryKey.split(':')[0];

    if (!isTestMode(mode) || mode === 'custom') {
      return null;
    }

    const candidates = await this.db.results.where('testMode').equals(mode).toArray();
    const comparable = candidates.filter(
      (result) =>
        !isDegenerateResult(result) &&
        getComparableCategoryKey(result.configuration) === categoryKey &&
        getCategoryKey(result.configuration) === categoryKey,
    );

    comparable.sort(
      (left, right) =>
        right.netWpm - left.netWpm ||
        right.accuracy - left.accuracy ||
        left.completedAt.localeCompare(right.completedAt),
    );

    return comparable[0] ?? null;
  }

  async delete(id: string): Promise<void> {
    await this.db.results.delete(id);
  }

  /**
   * Merge imported history by `clientTestId`. Existing records win; the
   * result is a count so the UI can report exactly what happened.
   */
  importResults(results: readonly TestResult[]): Promise<ImportSummary> {
    return this.db.transaction('rw', this.db.results, async () => {
      const existing = new Set(
        (await this.db.results.orderBy('clientTestId').keys()).filter(
          (key): key is string => typeof key === 'string',
        ),
      );
      const fresh: TestResult[] = [];
      let duplicates = 0;

      for (const result of results) {
        if (existing.has(result.clientTestId)) {
          duplicates += 1;
          continue;
        }

        existing.add(result.clientTestId);
        fresh.push(result);
      }

      if (fresh.length > 0) {
        await this.db.results.bulkAdd(fresh);
      }

      return { imported: fresh.length, duplicates, rejected: 0 };
    });
  }

  async getMeta(key: string): Promise<string | null> {
    const record = await this.db.meta.get(key);

    return record?.value ?? null;
  }

  async setMeta(key: string, value: string): Promise<void> {
    await this.db.meta.put({ key, value });
  }
}

function isTestMode(value: string | undefined): value is TestMode {
  return value === 'timed' || value === 'words' || value === 'quote' || value === 'custom';
}

let sharedRepository: LocalResultRepository | null = null;

export function getResultRepository(): LocalResultRepository {
  sharedRepository ??= new LocalResultRepository(getTypelabDatabase());

  return sharedRepository;
}
