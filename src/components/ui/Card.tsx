import { createElement } from 'react';
import type { HTMLAttributes } from 'react';

import { cardStyles } from '@/components/ui/styles';
import type { CardPadding } from '@/components/ui/styles';

type CardProps = HTMLAttributes<HTMLElement> & {
  as?: 'div' | 'section' | undefined;
  padding?: CardPadding | undefined;
  [key: `data-${string}`]: unknown;
};

export function Card({ as = 'div', padding = 'default', className, ...props }: CardProps) {
  return createElement(as, { ...props, className: cardStyles({ padding, className }) });
}
