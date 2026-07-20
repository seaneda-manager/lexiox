/* apps/web/app/components/ui/Button.tsx */
'use client';
import { cva, type VariantProps } from 'class-variance-authority';
import clsx from 'clsx';

const btn = cva(
  'inline-flex items-center justify-center rounded-2xl font-medium transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        primary: 'bg-brand-500 text-white hover:bg-brand-600 shadow-soft',
        outline: 'border border-gray-300 hover:bg-gray-50',
        ghost: 'hover:bg-gray-100',
        danger: 'bg-red-500 text-white hover:bg-red-600',
      },
      size: {
        sm: 'h-9 px-3 text-sm',
        md: 'h-10 px-4',
        lg: 'h-11 px-5 text-lg',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
);

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof btn>;
export default function Button({ className, variant, size, ...rest }: Props) {
  return <button className={clsx(btn({ variant, size }), className)} {...rest} />;
}





