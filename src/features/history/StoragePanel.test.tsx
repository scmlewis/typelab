import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { StoragePanel } from '@/features/history/StoragePanel';
import type { StorageSummary } from '@/features/history/resultRepository';

const NOW = new Date('2026-11-01T12:00:00.000Z');
const SUMMARY = {
  count: 12,
  bytes: 1536,
  oldestCompletedAt: '2026-01-02T12:00:00.000Z',
  newestCompletedAt: '2026-10-30T12:00:00.000Z',
  olderThan90Days: 3,
};

function createRepository(summary: StorageSummary = SUMMARY) {
  return {
    getStorageSummary: vi.fn(() => Promise.resolve(summary)),
    deleteOlderThan: vi.fn(() => Promise.resolve(3)),
    deleteAll: vi.fn(() => Promise.resolve(12)),
  };
}

function renderPanel(repository: ReturnType<typeof createRepository>) {
  return render(<StoragePanel repository={repository} now={() => NOW} />);
}

describe('storage panel', () => {
  it('shows the storage summary', async () => {
    const repository = createRepository();
    renderPanel(repository);

    const summary = await screen.findByTestId('storage-summary');

    expect(summary).toHaveTextContent('12 runs');
    expect(summary).toHaveTextContent('~1.5 kB');
    expect(summary).toHaveTextContent('3 older than 90 days');
    expect(repository.getStorageSummary).toHaveBeenCalledWith(NOW);
  });

  it('confirms before deleting runs older than 90 days', async () => {
    const user = userEvent.setup();
    const repository = createRepository();
    renderPanel(repository);
    await screen.findByTestId('storage-summary');

    await user.click(screen.getByRole('button', { name: 'Delete older than 90 days' }));
    expect(repository.deleteOlderThan).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Confirm delete 3 runs' }));

    await waitFor(() => {
      expect(repository.deleteOlderThan).toHaveBeenCalledWith('2026-08-03T12:00:00.000Z');
    });
    expect(await screen.findByText('Deleted 3 runs older than 90 days.')).toBeInTheDocument();
    expect(repository.getStorageSummary).toHaveBeenCalledTimes(2);
  });

  it('cancels a pending older-run deletion', async () => {
    const user = userEvent.setup();
    const repository = createRepository();
    renderPanel(repository);
    await screen.findByTestId('storage-summary');

    await user.click(screen.getByRole('button', { name: 'Delete older than 90 days' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(repository.deleteOlderThan).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Delete older than 90 days' })).toBeInTheDocument();
  });

  it('confirms before deleting all runs', async () => {
    const user = userEvent.setup();
    const repository = createRepository();
    renderPanel(repository);
    await screen.findByTestId('storage-summary');

    await user.click(screen.getByRole('button', { name: 'Delete all runs' }));
    expect(repository.deleteAll).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Confirm delete all 12 runs' }));

    await waitFor(() => {
      expect(repository.deleteAll).toHaveBeenCalledTimes(1);
    });
    expect(await screen.findByText('Deleted 12 runs.')).toBeInTheDocument();
  });

  it('disables controls when there is nothing to delete', async () => {
    const repository = createRepository({ ...SUMMARY, olderThan90Days: 0 });
    renderPanel(repository);

    expect(await screen.findByText('No runs are older than 90 days.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete older than 90 days' })).toBeDisabled();
  });

  it('shows an empty state with no saved runs', async () => {
    const repository = createRepository({
      count: 0,
      bytes: 0,
      oldestCompletedAt: null,
      newestCompletedAt: null,
      olderThan90Days: 0,
    });
    renderPanel(repository);

    expect(await screen.findByText('No runs saved yet.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete all runs' })).toBeDisabled();
  });

  it('recovers when the summary cannot be read', async () => {
    const repository = createRepository();
    repository.getStorageSummary.mockRejectedValueOnce(new Error('blocked'));
    renderPanel(repository);

    expect(
      await screen.findByText('Local storage could not be read. History is unchanged.'),
    ).toBeInTheDocument();
  });

  it('uses the singular when one run is involved', async () => {
    const user = userEvent.setup();
    const repository = createRepository({ ...SUMMARY, count: 1, olderThan90Days: 0 });
    repository.deleteAll.mockResolvedValueOnce(1);
    renderPanel(repository);
    await screen.findByTestId('storage-summary');

    await user.click(screen.getByRole('button', { name: 'Delete all runs' }));

    const confirm = screen.getByRole('button', { name: 'Confirm delete all 1 run' });

    await user.click(confirm);

    expect(await screen.findByText('Deleted 1 run.')).toBeInTheDocument();
  });

  it('links to the backup panel', async () => {
    renderPanel(createRepository());

    expect(await screen.findByRole('link', { name: 'Export a backup first' })).toHaveAttribute(
      'href',
      '#backup',
    );
  });
});
