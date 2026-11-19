import { describe, expect, it, vi, afterEach } from 'vitest';
import { newestFirst, postSchema, quickTimes, scheduleSchema, validateImage } from '@/lib/post-rules';
afterEach(() => vi.useRealTimers());
describe('Regras do agendamento', () => {
  it('bloqueia datas anteriores ao dia atual e permite hoje', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-19T14:00:00Z'));
    expect(scheduleSchema.safeParse({ scheduled_date: '2026-11-18', scheduled_time: '07:00' }).success).toBe(false);
    expect(scheduleSchema.safeParse({ scheduled_date: '2026-11-19', scheduled_time: '07:00' }).success).toBe(true);
  });
  it('oferece 07:00 e 19:30 e aceita outros horários', () => {
    expect(quickTimes).toEqual(['07:00', '19:30']);
    expect(scheduleSchema.safeParse({ scheduled_date: '2099-01-01', scheduled_time: '13:42' }).success).toBe(true);
    expect(scheduleSchema.safeParse({ scheduled_date: '2099-01-01', scheduled_time: '25:00' }).success).toBe(false);
  });
  it('aceita PNG, JPG e WEBP, não outros formatos', () => {
    for (const type of ['image/png', 'image/jpeg', 'image/webp']) expect(() => validateImage({ type, size: 123 })).not.toThrow();
    expect(() => validateImage({ type: 'image/gif', size: 123 })).toThrow();
  });
  it('permite legenda e hipótese vazias', () => expect(postSchema.safeParse({ caption: '', target_pain: '', scheduled_date: '2099-01-01', scheduled_time: '19:30' }).success).toBe(true));
  it('ordena registros do mais recente para o mais antigo', () => expect(newestFirst([{ created_at: '2026-11-18', id: 1 }, { created_at: '2026-11-19', id: 2 }]).map(r => r.id)).toEqual([2, 1]));
});