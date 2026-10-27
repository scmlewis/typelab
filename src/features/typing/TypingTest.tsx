import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';

import { generatePrompt } from '@/engine/prompt';
import type { Prompt, TestConfig } from '@/engine/types';
import { getTypelabDatabase } from '@/features/history/typelabDatabase';
import { LocalResultRepository } from '@/features/history/resultRepository';
import { LiveStats } from '@/features/typing/LiveStats';
import { ResultPanel } from '@/features/typing/ResultPanel';
import { TestToolbar } from '@/features/typing/TestToolbar';
import { TypingSurface } from '@/features/typing/TypingSurface';
import { TypingStore } from '@/features/typing/typingStore';
import { useTypingSelector } from '@/features/typing/useTypingSelector';
import { toTestConfig, testDefaultsFromConfig } from '@/features/settings/settings';
import { useSettings } from '@/features/settings/settingsContext';

interface TestSession {
  config: TestConfig;
  prompt: Prompt;
  store: TypingStore;
}

function createSession(config: TestConfig): TestSession {
  const prompt = generatePrompt(config);

  return {
    config,
    prompt,
    store: new TypingStore({ config, prompt }),
  };
}

function randomSeed(): number {
  return Math.floor(Math.random() * 0x1_0000_0000) >>> 0;
}

export function TypingTest() {
  const { settings, updateTestDefaults } = useSettings();
  const repository = useMemo(() => new LocalResultRepository(getTypelabDatabase()), []);
  const [session, setSession] = useState<TestSession>(() =>
    createSession(toTestConfig(settings, randomSeed())),
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const status = useTypingSelector(session.store, (state) => state.snapshot.status);
  const result = useTypingSelector(session.store, (state) => state.result);

  const launch = useCallback((nextConfig: TestConfig, existingPrompt?: Prompt) => {
    const config: TestConfig =
      existingPrompt === undefined ? { ...nextConfig, seed: randomSeed() } : nextConfig;
    const prompt = existingPrompt ?? generatePrompt(config);

    setSession({
      config,
      prompt,
      store: new TypingStore({ config, prompt }),
    });
  }, []);

  const nextTest = useCallback(() => {
    launch(session.config);
  }, [launch, session.config]);

  const repeatTest = useCallback(() => {
    launch(session.config, session.prompt);
  }, [launch, session.config, session.prompt]);

  const changeConfig = useCallback(
    (nextConfig: TestConfig) => {
      launch(nextConfig);

      const defaults = testDefaultsFromConfig(nextConfig);

      if (defaults) {
        void updateTestDefaults(defaults);
      }
    },
    [launch, updateTestDefaults],
  );

  useEffect(() => {
    if (result === null) {
      setSaveError(null);
      setSaveState('idle');
      return;
    }

    let cancelled = false;
    setSaveState('saving');

    repository
      .save(result)
      .then(() => {
        if (!cancelled) {
          setSaveState('saved');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSaveState('error');
          setSaveError(
            'This run could not be saved to local history. Browser storage may be full or blocked.',
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [repository, result]);

  useEffect(() => {
    if (typeof requestAnimationFrame !== 'function') {
      return;
    }

    const store = session.store;
    let frame = requestAnimationFrame(function loop() {
      store.tick();
      frame = requestAnimationFrame(loop);
    });

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [session.store]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        nextTest();
      }
    };

    window.addEventListener('keydown', handler);

    return () => {
      window.removeEventListener('keydown', handler);
    };
  }, [nextTest]);

  const terminal = status === 'completed' || status === 'failed' || status === 'cancelled';

  return (
    <div className="mt-6 rounded-card border border-line bg-surface p-5 shadow-card sm:mt-8 sm:p-8">
      <TestToolbar
        config={session.config}
        disabled={status === 'running'}
        onChange={changeConfig}
        onRestart={nextTest}
      />

      {terminal ? (
        <>
          <ResultPanel onNext={nextTest} onRepeat={repeatTest} result={result} status={status} />
          {result ? (
            <div
              aria-live="polite"
              className="mt-4 flex flex-wrap items-center gap-3 text-xs text-ink-muted"
              data-save-status={saveState}
              data-testid="save-status"
            >
              {saveState === 'saving' ? <span>Saving to local history…</span> : null}
              {saveState === 'saved' ? (
                <>
                  <span>Saved to local history.</span>
                  <Link className="font-medium underline underline-offset-4" to="/history">
                    View history
                  </Link>
                </>
              ) : null}
            </div>
          ) : null}
          {saveError ? (
            <p
              className="mt-4 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-xs leading-5 text-danger"
              role="alert"
            >
              {saveError}
            </p>
          ) : null}
        </>
      ) : (
        <>
          <LiveStats config={session.config} store={session.store} />
          <TypingSurface store={session.store} />
        </>
      )}

      <p className="mt-6 border-t border-line/70 pt-4 text-xs leading-5 text-ink-muted">
        Tab moves focus. Esc ends the run. Ctrl + Enter starts a new text with the same settings.
      </p>
    </div>
  );
}
