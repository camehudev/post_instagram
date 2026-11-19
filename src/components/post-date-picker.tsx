import { useState } from 'react';
import { CalendarDays, ChevronDown } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { todayInBrazil } from '@/lib/post-rules';

export function PostDatePicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  return <Popover open={open} onOpenChange={setOpen}><PopoverTrigger asChild><Button type="button" variant="outline" className="date-control" aria-label="Data de publicação"><CalendarDays /><span>{value ? format(parseISO(value), 'dd/MM/yyyy') : 'Selecionar data'}</span><ChevronDown /></Button></PopoverTrigger><PopoverContent align="start" className="w-auto p-0 pointer-events-auto"><Calendar locale={ptBR} mode="single" selected={value ? parseISO(value) : undefined} disabled={{ before: parseISO(todayInBrazil()) }} onSelect={date => { if (date) onChange(format(date, 'yyyy-MM-dd')); setOpen(false); }} className="pointer-events-auto" /></PopoverContent></Popover>;
}