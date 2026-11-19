import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { postSchema, scheduleSchema, validateImage } from './post-rules';

export const listPosts = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const rows = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await context.supabase.from('scheduled_posts').select('*').order('created_at', { ascending: false }).range(offset, offset + 999);
    if (error) throw new Error('Não foi possível carregar os posts.');
    rows.push(...data);
    if (data.length < 1000) break;
  }
  return rows;
});
export const createPost = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((input: FormData) => input).handler(async ({ data, context }) => {
  const fields = postSchema.parse(Object.fromEntries(['caption', 'target_pain', 'scheduled_date', 'scheduled_time'].map(k => [k, data.get(k)])));
  const file = data.get('image');
  if (!(file instanceof File)) throw new Error('Selecione a imagem do post.');
  validateImage(file);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const png = bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71;
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const webp = new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF' && new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP';
  if (!(file.type === 'image/png' && png || file.type === 'image/jpeg' && jpeg || file.type === 'image/webp' && webp)) throw new Error('O arquivo não é uma imagem válida.');
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/jpeg' ? 'jpg' : 'webp';
  const path = `${context.userId}/${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await context.supabase.storage.from('post-images').upload(path, bytes, { contentType: file.type });
  if (uploadError) throw new Error('Não foi possível enviar a imagem. Tente novamente.');
  const image_url = `${import.meta.env['VITE_SUPABASE_URL']}/storage/v1/object/public/post-images/${path}`;
  const { error } = await context.supabase.from('scheduled_posts').insert({ ...fields, image_url, user_id: context.userId });
  if (error) {
    await context.supabase.storage.from('post-images').remove([path]);
    throw new Error('Não foi possível salvar o agendamento.');
  }
  return { success: true };
});
export const editPost = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator(input => scheduleSchema.extend({ id: z.string().uuid() }).parse(input)).handler(async ({ data, context }) => {
  const { id, ...fields } = data;
  const { data: row, error } = await context.supabase.from('scheduled_posts').update(fields).eq('id', id).select('id').single();
  if (error || !row) throw new Error('Não foi possível atualizar o agendamento.');
  return { success: true };
});
export const deletePost = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator(input => z.object({ id: z.string().uuid() }).parse(input)).handler(async ({ data, context }) => {
  const { data: row, error: readError } = await context.supabase.from('scheduled_posts').select('image_url').eq('id', data.id).single();
  if (readError || !row) throw new Error('Post não encontrado.');
  const { error } = await context.supabase.from('scheduled_posts').delete().eq('id', data.id);
  if (error) throw new Error('Não foi possível excluir o post.');
  const path = row.image_url.split('/post-images/')[1];
  if (path?.startsWith(`${context.userId}/`)) await context.supabase.storage.from('post-images').remove([path]);
  return { success: true };
});