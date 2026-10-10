// 'de-DE' raggruppa anche i numeri a 4 cifre (2.340), mentre 'it-IT' scriverebbe 2340
export const formatScore = (n: number): string => n.toLocaleString('de-DE');