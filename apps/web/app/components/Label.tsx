'use client';
import { toDisplayLabel } from '@/lib/labels';

export default function Label({ textKey }: { textKey: string }) {
  return <span>{toDisplayLabel(textKey)}</span>;
}





