/* apps/web/app/components/ui/Card.tsx */
import clsx from 'clsx';

export function Card({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx('rounded-2xl bg-white shadow-soft border border-gray-100', className)} {...props} />;
}
export function CardHeader({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx('px-5 pt-5 pb-3 border-b border-gray-100', className)} {...props} />;
}
export function CardContent({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx('p-5', className)} {...props} />;
}





