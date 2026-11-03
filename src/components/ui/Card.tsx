import { createElement } from 'react';
import type { HTMLAttributes } from 'react';

import { cardStyles } from '@/components/ui/styles';
import type { CardPadding, CardTone } from '@/components/ui/styles';

type CardProps = HTMLAttributes<HTMLElement> & {
  as?: 'div' | 'section' | undefined;
  padding?: CardPadding | undefined;
  tone?: CardTone | undefined;
  [key: `data-${string}`]: unknown;
};

export function Card({
  as = 'div',
  padding = 'default',
  tone = 'default',
  className,
  ...props
}: CardProps) {
  return createElement(as, { ...props, className: cardStyles({ padding, tone, className }) });
}
