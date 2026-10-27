import { useCallback, useEffect, useState } from 'react';

import { DEFAULT_TIMED_CONFIG } from '@/engine/config';
import { generatePrompt } from '@/engine/prompt';
import type { Prompt, TestConfig } from '@/engine/types';
import { LiveStats } from '@/features/typing/LiveStats';
import { ResultPanel } from '@/features/typing/ResultPanel';
import { TestToolbar } from '@/features/typing/TestToolbar';
import { TypingSurface } from '@/features/typing/TypingSurface';
import { TypingStore } from '@/features/typing/typingStore';
import { useTypingSelector } from '@/features/typing/useTypingSelector';

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
  const [session, setSession] = useState<TestSession>(() => createSession(DEFAULT_TIMED_CONFIG));
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
        onChange={(next) => {
          launch(next);
        }}
        onRestart={nextTest}
      />

      {terminal ? (
        <ResultPanel onNext={nextTest} onRepeat={repeatTest} result={result} status={status} />
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
