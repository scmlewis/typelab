import type { ComponentProps } from 'react';

import { buttonStyles } from '@/components/ui/styles';
import type { ButtonSize, ButtonVariant } from '@/components/ui/styles';

type ButtonProps = ComponentProps<'button'> & {
  variant?: ButtonVariant | undefined;
  size?: ButtonSize | undefined;
};

export function Button({
  variant = 'secondary',
  size = 'md',
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return <button {...props} className={buttonStyles({ variant, size, className })} type={type} />;
}
