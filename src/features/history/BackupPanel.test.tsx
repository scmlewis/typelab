import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_TIMED_CONFIG } from '@/engine/config';
import type { TestResult } from '@/engine/types';
import { BackupPanel } from '@/features/history/BackupPanel';
import { buildBackup, serializeBackup } from '@/features/history/backup';
import { downloadText } from '@/features/history/download';
import { DEFAULT_SETTINGS } from '@/features/settings/settings';
import { SettingsProvider } from '@/features/settings/SettingsProvider';
import type { SettingsRepositoryLike } from '@/features/settings/SettingsProvider';

vi.mock('@/features/history/download', () => ({
  downloadText: vi.fn(),
  backupFileName: () => 'typelab-backup-test.json',
  csvFileName: () => 'typelab-history-test.csv',
}));

function makeResult(overrides: Partial<TestResult> = {}): TestResult {
  return {
    id: 'result-1',
    clientTestId: 'client-1',
    testMode: 'timed',
    language: 'english',
    configuration: DEFAULT_TIMED_CONFIG,
    promptId: 'prompt-1',
    seed: 1,
    durationMs: 30_000,
    wordCount: null,
    netWpm: 61.5,
    rawWpm: 64,
    accuracy: 96.4,
    characterStatistics: {
      correct: 150,
      incorrect: 2,
      extra: 1,
      missed: 0,
      correctSeparators: 25,
      extraSeparators: 0,
      missedSeparators: 0,
    },
    consistency: 82.1,
    flags: [],
    samples: [],
    scoringVersion: '1.0.0',
    generatorVersion: '1.0.0',
    failureReason: null,
    completedAt: '2026-10-27T12:00:00.000Z',
    createdAt: '2026-10-27T12:00:00.000Z',
    ...overrides,
  };
}

function createRepository(results: TestResult[] = []) {
  const getAll = vi.fn(() => Promise.resolve(results));
  const importResults = vi.fn(() => Promise.resolve({ imported: 1, duplicates: 0, rejected: 0 }));
  const getMeta = vi.fn(() => Promise.resolve<string | null>(null));
  const setMeta = vi.fn(() => Promise.resolve());

  return { getAll, importResults, getMeta, setMeta };
}

function createSettingsRepository() {
  const repository: SettingsRepositoryLike = {
    load: vi.fn(() => Promise.resolve({ settings: DEFAULT_SETTINGS, notice: null })),
    save: vi.fn(() => Promise.resolve()),
    reset: vi.fn(() => Promise.resolve()),
  };

  return repository;
}

function renderPanel(
  repository: ReturnType<typeof createRepository>,
  settingsRepository = createSettingsRepository(),
) {
  return render(
    <SettingsProvider repository={settingsRepository}>
      <BackupPanel repository={repository} />
    </SettingsProvider>,
  );
}

beforeEach(() => {
  vi.mocked(downloadText).mockClear();
});

describe('backup panel', () => {
  it('exports JSON containing settings and every run', async () => {
    const user = userEvent.setup();
    const repository = createRepository([makeResult()]);

    renderPanel(repository);
    await user.click(screen.getByRole('button', { name: /export backup/i }));

    await waitFor(() => {
      expect(downloadText).toHaveBeenCalledTimes(1);
    });

    const [filename, contents] = vi.mocked(downloadText).mock.calls[0] ?? [];
    const parsed = JSON.parse(String(contents)) as {
      settings: unknown;
      results: unknown[];
    };

    expect(filename).toBe('typelab-backup-test.json');
    expect(parsed.settings).toEqual(DEFAULT_SETTINGS);
    expect(parsed.results).toHaveLength(1);
    expect(repository.setMeta).toHaveBeenCalledWith('lastExportAt', expect.any(String));
    expect(await screen.findByText(/exported 1 run and your settings/i)).toBeInTheDocument();
  });

  it('exports CSV rows', async () => {
    const user = userEvent.setup();
    const repository = createRepository([makeResult()]);

    renderPanel(repository);
    await user.click(screen.getByRole('button', { name: 'Export CSV' }));

    await waitFor(() => {
      expect(downloadText).toHaveBeenCalledWith(
        'typelab-history-test.csv',
        expect.stringContaining('completedAt,mode,language'),
        'text/csv;charset=utf-8',
      );
    });
  });

  it('previews and imports a backup file', async () => {
    const user = userEvent.setup();
    const repository = createRepository();
    const incoming = makeResult({ id: 'incoming', clientTestId: 'incoming-client' });
    const contents = serializeBackup(
      buildBackup({ settings: DEFAULT_SETTINGS, results: [incoming] }),
    );

    renderPanel(repository);
    await user.upload(
      screen.getByLabelText('Import backup'),
      new File([contents], 'backup.json', { type: 'application/json' }),
    );

    expect(await screen.findByText(/1 new run, 0 duplicates/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Import 1 run' }));

    await waitFor(() => {
      expect(repository.importResults).toHaveBeenCalledWith([incoming]);
    });
    expect(await screen.findByText(/imported 1 new run/i)).toBeInTheDocument();
    expect(repository.setMeta).toHaveBeenCalledWith('lastImportAt', expect.any(String));
  });

  it('rejects a file that is not a TypeLab backup', async () => {
    const user = userEvent.setup();
    const repository = createRepository();

    renderPanel(repository);
    await user.upload(
      screen.getByLabelText('Import backup'),
      new File(['{"format":"other"}'], 'bad.json', { type: 'application/json' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(/not a TypeLab backup/i);
    expect(repository.importResults).not.toHaveBeenCalled();
  });

  it('shows the last export date when one exists', async () => {
    const repository = createRepository();
    repository.getMeta.mockResolvedValue('2026-10-27T12:00:00.000Z');

    renderPanel(repository);

    expect(await screen.findByText(/last export:/i)).toHaveTextContent(/2026/i);
  });
});
