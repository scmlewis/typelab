import type { SharedResultSnapshot } from '@/features/share/shareData';
import { describeShareMode, formatShareDate } from '@/features/share/shareData';
import { formatDuration, formatPercent } from '@/features/typing/format';

export const SHARE_CARD_WIDTH = 1_200;
export const SHARE_CARD_HEIGHT = 630;

const PAPER = '#f4efe4';
const INK = '#1e231f';
const MUTED = '#67675f';
const LINE = '#d7cebd';
const ACCENT = '#b84f2a';

const MONO = "ui-monospace, 'SFMono-Regular', 'Cascadia Code', Menlo, Consolas, monospace";
const EDITORIAL = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif";

export interface ShareCardText {
  mode: string;
  netWpm: string;
  rawWpm: string;
  accuracy: string;
  consistency: string;
  time: string;
  detail: string;
  attribution: string | null;
  date: string;
  excluded: boolean;
}

/** The text that goes on the card, kept separate so it can be checked without a canvas. */
export function shareCardText(snapshot: SharedResultSnapshot): ShareCardText {
  return {
    mode: `${describeShareMode(snapshot)} · ${capitalise(snapshot.language)}`.toUpperCase(),
    netWpm: snapshot.netWpm.toFixed(1),
    rawWpm: snapshot.rawWpm.toFixed(1),
    accuracy: formatPercent(snapshot.accuracy, 1),
    consistency: formatPercent(snapshot.consistency, 1),
    time: formatDuration(snapshot.durationMs),
    detail: snapshot.configSummary,
    attribution:
      snapshot.quoteSource === null
        ? null
        : `${snapshot.quoteSource}${snapshot.quoteAuthor === null ? '' : ` — ${snapshot.quoteAuthor}`}`,
    date: formatShareDate(snapshot.completedAt),
    excluded: snapshot.excluded,
  };
}

export function shareCardFileName(completedAt: string): string {
  return `typelab-result-${formatShareDate(completedAt)}.png`;
}

export function createShareCard(snapshot: SharedResultSnapshot): HTMLCanvasElement {
  const canvas = document.createElement('canvas');

  canvas.width = SHARE_CARD_WIDTH;
  canvas.height = SHARE_CARD_HEIGHT;

  const context = canvas.getContext('2d');

  if (context === null) {
    throw new Error('This browser cannot draw a share card.');
  }

  paintShareCard(context, shareCardText(snapshot));

  return canvas;
}

export function shareCardBlob(snapshot: SharedResultSnapshot): Promise<Blob> {
  const canvas = createShareCard(snapshot);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob === null) {
        reject(new Error('The share card could not be encoded.'));
        return;
      }

      resolve(blob);
    }, 'image/png');
  });
}

function paintShareCard(context: CanvasRenderingContext2D, text: ShareCardText): void {
  const left = 72;
  const right = SHARE_CARD_WIDTH - left;

  context.fillStyle = PAPER;
  context.fillRect(0, 0, SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT);

  context.fillStyle = ACCENT;
  context.fillRect(0, 0, SHARE_CARD_WIDTH, 10);

  context.textBaseline = 'alphabetic';
  context.fillStyle = INK;
  context.font = `600 38px ${EDITORIAL}`;
  context.fillText('TypeLab.', left, 106);

  context.font = `16px ${MONO}`;
  context.fillStyle = MUTED;
  context.textAlign = 'right';
  context.fillText('A LOCAL-FIRST TYPING TEST', right, 102);

  if (text.excluded) {
    context.fillStyle = ACCENT;
    context.fillText('UNRANKED · EXCLUDED FROM BESTS', right, 130);
  }

  context.textAlign = 'left';
  context.fillStyle = ACCENT;
  context.font = `18px ${MONO}`;
  context.fillText(text.mode, left, 160);

  rule(context, left, 190, right);

  context.fillStyle = MUTED;
  context.font = `17px ${MONO}`;
  context.fillText('NET WPM', left, 252);

  context.fillStyle = INK;
  const numberFont = `700 168px ${MONO}`;
  context.font = numberFont;
  context.fillText(text.netWpm, left, 408);

  const numberWidth = context.measureText(text.netWpm).width;
  context.fillStyle = MUTED;
  context.font = `30px ${MONO}`;
  context.fillText('WPM', left + numberWidth + 18, 408);

  const metricLeft = 700;
  const metricGap = 240;

  drawMetric(context, metricLeft, 260, 'RAW WPM', text.rawWpm);
  drawMetric(context, metricLeft + metricGap, 260, 'ACCURACY', text.accuracy);
  drawMetric(context, metricLeft, 410, 'CONSISTENCY', text.consistency);
  drawMetric(context, metricLeft + metricGap, 410, 'TIME', text.time);

  rule(context, left, 490, right);

  context.font = `20px ${MONO}`;
  context.fillStyle = INK;
  context.fillText(truncate(context, text.detail, right - left), left, 536);

  if (text.attribution !== null) {
    context.font = `italic 18px ${EDITORIAL}`;
    context.fillStyle = MUTED;
    context.fillText(truncate(context, text.attribution, right - left), left, 566);
  }

  context.font = `16px ${MONO}`;
  context.fillStyle = MUTED;
  context.fillText(`${text.date} · scoring snapshot · not a verified score`, left, 600);

  context.textAlign = 'right';
  context.fillText('typelab · no account, no tracking', right, 600);
  context.textAlign = 'left';
}

function drawMetric(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  label: string,
  value: string,
): void {
  context.textAlign = 'left';
  context.font = `16px ${MONO}`;
  context.fillStyle = MUTED;
  context.fillText(label, x, y);

  context.font = `44px ${MONO}`;
  context.fillStyle = INK;
  context.fillText(value, x, y + 52);
}

function rule(context: CanvasRenderingContext2D, left: number, y: number, right: number): void {
  context.fillStyle = LINE;
  context.fillRect(left, y, right - left, 1);
}

function truncate(context: CanvasRenderingContext2D, value: string, maxWidth: number): string {
  if (context.measureText(value).width <= maxWidth) {
    return value;
  }

  let end = value.length;

  while (end > 0 && context.measureText(`${value.slice(0, end)}…`).width > maxWidth) {
    end -= 1;
  }

  return `${value.slice(0, end).trimEnd()}…`;
}

function capitalise(value: string): string {
  return value.length === 0 ? value : value.charAt(0).toUpperCase() + value.slice(1);
}
