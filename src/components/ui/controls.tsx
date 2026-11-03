import type { ComponentProps } from 'react';

import { controlStyles } from '@/components/ui/styles';
import type { ControlDensity } from '@/components/ui/styles';

type ControlProps<Tag extends 'input' | 'select' | 'textarea'> = ComponentProps<Tag> & {
  density?: ControlDensity | undefined;
};

export function Input({ className, density = 'md', ...props }: ControlProps<'input'>) {
  return <input {...props} className={controlStyles({ density, className })} />;
}

export function Select({ className, density = 'md', ...props }: ControlProps<'select'>) {
  return <select {...props} className={controlStyles({ density, className })} />;
}

export function Textarea({ className, density = 'md', ...props }: ControlProps<'textarea'>) {
  return <textarea {...props} className={controlStyles({ density, className })} />;
}
