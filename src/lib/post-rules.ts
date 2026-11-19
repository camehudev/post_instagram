import { z } from 'zod';

export const quickTimes = ['07:00', '19:30'] as const;
export function todayInBrazil(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const get = (type: string) => parts.find(p => p.type === type)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
export const scheduleSchema = z.object({
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => !Number.isNaN(Date.parse(v)) && v >= todayInBrazil(), 'Escolha hoje ou uma data futura.'),
  scheduled_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Escolha um horário válido.'),
});
export const postSchema = scheduleSchema.extend({ caption: z.string().trim().max(2200), target_pain: z.string().trim().max(200) });
export function validateImage(file: { type: string; size: number }) {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('Escolha uma imagem PNG, JPG ou WEBP.');
  if (file.size <= 0 || file.size > 10 * 1024 * 1024) throw new Error('A imagem deve ter até 10 MB.');
}
export function newestFirst<T extends { created_at: string }>(rows: T[]) {
  return [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at));
}