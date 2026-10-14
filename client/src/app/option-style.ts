export const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

export function optionBadge(i: number): string {
  return [
    'bg-brand-teal text-white',
    'bg-brand-orange text-brand-ink',
    'bg-brand-ink text-white',
    'bg-[#BFE3E6] text-brand-ink',
  ][i] ?? 'bg-brand-ink text-white';
}