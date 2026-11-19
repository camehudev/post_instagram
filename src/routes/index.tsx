import { createFileRoute, useRouter } from '@tanstack/react-router';
import { useEffect, useRef, useState, Suspense } from 'react';
import { queryOptions, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { CalendarDays, Clock3, ImagePlus, Images, Plus, Upload, Search, ArrowDownWideNarrow, CheckCheck, CircleAlert, Instagram, Copy, Pencil, Trash2, X, Loader2, ShieldCheck, Tag, LogOut, Sun, Moon, Image as ImageIcon } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { LovableMark } from '@lovable.dev/cloud-auth-js/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { PostDatePicker } from '@/components/post-date-picker';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
import type { Tables } from '@/integrations/supabase/types';
import { createPost, listPosts, editPost, deletePost } from '@/lib/posts.functions';
import { newestFirst, postSchema, quickTimes, scheduleSchema, todayInBrazil, validateImage } from '@/lib/post-rules';

export const Route = createFileRoute('/')({
  head: () => ({ meta: [
    { title: 'Agendamentos · Agenda Instagram' },
    { name: 'description', content: 'Agende imagens, organize legendas e acompanhe seus posts do Instagram em um só lugar.' },
    { property: 'og:title', content: 'Agendamentos · Agenda Instagram' },
    { property: 'og:description', content: 'Seu calendário de conteúdo: agende, organize e acompanhe posts do Instagram.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  loader: async () => {
    const { data } = await supabase.auth.getSession();
    return { user: data.session?.user ? { id: data.session.user.id, email: data.session.user.email } : null };
  },
  component: Index,
});
type Post = Tables<'scheduled_posts'>;
const statusLabels: Record<string, string> = { pendente: 'Pendente', publicado: 'Publicado', erro: 'Erro' };
const makeQuery = (id: string) => queryOptions({ queryKey: ['posts', id], queryFn: () => listPosts(), refetchInterval: 60000 });

function GoogleMark() { return <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>; }
async function signIn(provider: 'google' | 'lovable') {
  const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
  if (result.error) toast.error('Não foi possível entrar. Tente novamente.');
}
function Index() {
  const { user } = Route.useLoaderData();
  return <><header className="app-header"><div className="header-inner"><div className="brand"><span className="brand-mark"><CalendarDays size={21} /></span>Agenda Instagram</div><div className="header-right"><span className="channel-label"><Instagram size={15} /> Instagram</span>{user ? <><span className="user-avatar" title={user.email}>{user.email?.slice(0, 2).toUpperCase() || 'AI'}</span><Button variant="ghost" size="icon" title="Sair" aria-label="Sair" onClick={() => supabase.auth.signOut()}><LogOut /></Button></> : <Button variant="outline" size="sm" onClick={() => signIn('google')}>Entrar <GoogleMark /></Button>}</div></div></header><main className="app-main"><div className="page-title-row"><div><div className="eyebrow">Seu conteúdo, no tempo certo</div><h1>Agendamentos</h1><p className="page-subtitle">Um espaço para organizar suas ideias e planejar seus próximos posts.</p></div><div className="timezone"><Clock3 size={14} /> Horário de Brasília <span>·</span> UTC−3</div></div>{user ? <Suspense fallback={<LoadingWorkspace />}><SignedWorkspace userId={user.id} /></Suspense> : <><Summary posts={[]} /><div className="workspace"><Composer signedIn={false} onSaved={() => {}} /><section className="post-list"><ListHeader count={0} /><div className="empty-state"><EmptyArt /><h3>Seu próximo post começa aqui</h3><p>Entre na sua conta para salvar seus agendamentos e acompanhar seus posts.</p><div className="signin-actions"><Button variant="outline" onClick={() => signIn('google')}><GoogleMark /> Continuar com Google</Button><Button variant="outline" onClick={() => signIn('lovable')}><LovableMark /> Continuar com Lovable</Button></div></div></section></div></>}<footer className="bottom-note"><span><ShieldCheck size={13} /> Seus agendamentos, organizados em um só lugar.</span><span>Feito para dar mais espaço à sua criatividade <span>✳</span></span></footer></main></>;
}
function Summary({ posts }: { posts: Post[] }) {
  const items = [{ label: 'Total de posts', value: posts.length, Icon: Images, tone: '' }, { label: 'Pendentes', value: posts.filter(p => p.status === 'pendente').length, Icon: Clock3, tone: 'tone-pendente' }, { label: 'Publicados', value: posts.filter(p => p.status === 'publicado').length, Icon: CheckCheck, tone: 'tone-publicado' }, { label: 'Com erro', value: posts.filter(p => p.status === 'erro').length, Icon: CircleAlert, tone: 'tone-erro' }];
  return <div className="summary-grid">{items.map(({ label, value, Icon, tone }) => <div className="summary-item" key={label}><div><div className="summary-label">{label}</div><div className="summary-number">{String(value).padStart(2, '0')}</div></div><div className={`summary-icon ${tone}`}><Icon /></div></div>)}</div>;
}
function EmptyArt() { return <div className="empty-art" aria-hidden="true"><div className="empty-photo back" /><div className="empty-photo front"><div className="empty-landscape"><ImageIcon /></div><div className="empty-line" /><div className="empty-line short" /></div></div>; }
function LoadingWorkspace() { return <><div className="summary-grid">{[1,2,3,4].map(n => <Skeleton key={n} className="h-24" />)}</div><div className="workspace"><Skeleton className="h-[680px]" /><div className="posts-grid">{[1,2].map(n => <Skeleton key={n} className="h-80" />)}</div></div></>; }
function ListHeader({ count, onRefresh }: { count: number; onRefresh?: () => void }) { return <div className="list-heading"><h2>Seus posts <span className="count-pill">{count}</span></h2>{onRefresh && <Button variant="ghost" size="sm" onClick={onRefresh} title="Atualizar posts"><ArrowDownWideNarrow size={14} /><span className="text-xs">Atualizar</span></Button>}</div>; }

function Composer({ signedIn, onSaved }: { signedIn: boolean; onSaved: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [caption, setCaption] = useState('');
  const [pain, setPain] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const submit = useServerFn(createPost);
  useEffect(() => { if (!file) { setPreview(''); return; } const url = URL.createObjectURL(file); setPreview(url); return () => URL.revokeObjectURL(url); }, [file]);
  function chooseFile(next?: File) { if (!next) return; try { validateImage(next); setFile(next); } catch (e) { toast.error(e instanceof Error ? e.message : 'Imagem inválida.'); } }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { toast.error('Selecione a imagem do post.'); return; }
    const parsed = postSchema.safeParse({ caption, target_pain: pain, scheduled_date: date, scheduled_time: time });
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message || 'Confira os campos obrigatórios.'); return; }
    if (!signedIn) { toast('Entre na sua conta para agendar o post.'); return; }
    setBusy(true);
    try { const body = new FormData(); body.set('image', file); Object.entries(parsed.data).forEach(([k, v]) => body.set(k, v)); await submit({ data: body }); setFile(null); setCaption(''); setPain(''); setDate(''); setTime(''); if (inputRef.current) inputRef.current.value = ''; toast.success('Post agendado com sucesso!'); onSaved(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Não foi possível agendar.'); } finally { setBusy(false); }
  }
  return <section className="composer"><div className="composer-heading"><h2 className="section-heading"><Plus /> Novo agendamento</h2><p className="section-description">Prepare o seu próximo post do Instagram.</p></div><form className="composer-body" onSubmit={save}><div><label className="field-label" htmlFor="post-image">Imagem do post <span className="required-mark">*</span></label><input ref={inputRef} id="post-image" type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={e => chooseFile(e.target.files?.[0])} disabled={busy} /><div className={`dropzone ${drag ? 'drag-active' : ''}`} onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={e => { e.preventDefault(); setDrag(false); if (!busy) chooseFile(e.dataTransfer.files[0]); }}>{preview ? <><img className="uploaded-preview" src={preview} alt="Prévia da imagem do post" /><Button type="button" size="icon" variant="secondary" className="remove-image" title="Remover imagem" aria-label="Remover imagem" disabled={busy} onClick={() => { setFile(null); if (inputRef.current) inputRef.current.value = ''; }}><X /></Button></> : <Button type="button" variant="ghost" className="h-auto w-full flex-col py-6 gap-2" aria-label="Selecionar imagem" onClick={() => inputRef.current?.click()} disabled={busy}><div className="upload-icon"><Upload size={20} /></div><strong>Arraste sua imagem até aqui</strong><span>ou <span className="upload-link">escolha um arquivo</span></span><span>PNG, JPG ou WEBP · até 10 MB</span></Button>}</div></div><div><label className="field-label" htmlFor="caption">Legenda <span className="field-optional">(opcional)</span></label><Textarea id="caption" placeholder="O que você quer compartilhar?" value={caption} onChange={e => setCaption(e.target.value)} maxLength={2200} className="min-h-28 resize-y text-xs shadow-none" disabled={busy} /><div className="caption-counter">{caption.length.toLocaleString('pt-BR')} / 2.200</div></div><div className="schedule-fields"><div><label className="field-label">Data de publicação <span className="required-mark">*</span></label><PostDatePicker value={date} onChange={setDate} /></div><div><label className="field-label" htmlFor="time">Horário <span className="required-mark">*</span></label><Input id="time" type="time" className="time-control shadow-none" value={time} onChange={e => setTime(e.target.value)} disabled={busy} /><div className="quick-times">{quickTimes.map((t, i) => <Button key={t} type="button" variant={time === t ? 'secondary' : 'outline'} onClick={() => setTime(t)} disabled={busy}>{i === 0 ? <Sun /> : <Moon />}{t}</Button>)}</div></div></div><div><label className="field-label" htmlFor="pain">Público-alvo / hipótese de dor <span className="field-optional">(opcional)</span></label><Input id="pain" placeholder="Ex.: empreendedores sem tempo" value={pain} onChange={e => setPain(e.target.value)} maxLength={200} className="text-xs h-10 shadow-none" disabled={busy} /><p className="field-help">Qual público ou dor você está testando?</p></div><Button className="submit-post" disabled={busy} type="submit">{busy ? <Loader2 className="animate-spin" /> : <CalendarDays />}{busy ? 'Salvando agendamento...' : 'Agendar Post'}</Button><p className="composer-foot"><Clock3 size={11} /> Horários no fuso de Brasília (UTC−3)</p></form></section>;
}

function SignedWorkspace({ userId }: { userId: string }) {
  const options = makeQuery(userId);
  const { data } = useSuspenseQuery(options);
  const posts = newestFirst(data);
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('todos');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Post | null>(null);
  const [removing, setRemoving] = useState<Post | null>(null);
  const [expanded, setExpanded] = useState<Post | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [busy, setBusy] = useState(false);
  const edit = useServerFn(editPost);
  const remove = useServerFn(deletePost);
  const refresh = () => { queryClient.invalidateQueries({ queryKey: options.queryKey }); };
  const visible = posts.filter(p => (status === 'todos' || p.status === status) && `${p.caption || ''} ${p.target_pain || ''} ${p.scheduled_date}`.toLocaleLowerCase('pt-BR').includes(search.trim().toLocaleLowerCase('pt-BR')));
  async function update() {
    if (!editing) return;
    const parsed = scheduleSchema.safeParse({ scheduled_date: editDate, scheduled_time: editTime });
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message); return; }
    setBusy(true); try { await edit({ data: { id: editing.id, ...parsed.data } }); setEditing(null); toast.success('Agendamento atualizado.'); refresh(); } catch (e) { toast.error(e instanceof Error ? e.message : 'Falha ao atualizar.'); } finally { setBusy(false); }
  }
  async function destroy() { if (!removing) return; setBusy(true); try { await remove({ data: { id: removing.id } }); setRemoving(null); toast.success('Post excluído.'); refresh(); } catch (e) { toast.error(e instanceof Error ? e.message : 'Falha ao excluir.'); } finally { setBusy(false); } }
  async function copyImage(post: Post) {
    try { const path = post.image_url.split('/post-images/')[1]; if (!path) throw new Error(); const { data: url } = await supabase.storage.from('post-images').createSignedUrl(path, 3600); await navigator.clipboard.writeText(url?.signedUrl || post.image_url); toast.success('Link da imagem copiado.', { description: url ? 'Este link privado é válido por 1 hora.' : undefined }); } catch { toast.error('Não foi possível copiar o link.'); }
  }
  return <><Summary posts={posts} /><div className="workspace"><Composer signedIn onSaved={refresh} /><section className="post-list"><ListHeader count={posts.length} onRefresh={refresh} /><div className="list-tools"><div className="status-tabs" role="group" aria-label="Filtrar por status">{['todos', 'pendente', 'publicado', 'erro'].map(s => <Button key={s} variant="ghost" className={status === s ? 'selected' : ''} aria-pressed={status === s} onClick={() => setStatus(s)}>{s === 'todos' ? 'Todos' : statusLabels[s]}</Button>)}</div><div className="search-field"><Search /><Input aria-label="Buscar posts" placeholder="Buscar posts..." value={search} onChange={e => setSearch(e.target.value)} maxLength={200} /></div></div><div className="sort-label"><ArrowDownWideNarrow size={12} /> Mais recentes primeiro</div>{visible.length ? <div className="posts-grid">{visible.map(post => <article className="post-card" key={post.id}><Button variant="ghost" className="post-image-button" aria-label="Ampliar imagem do post" onClick={() => setExpanded(post)}><StoredImage post={post} className="post-image" /><span className={`status-badge tone-${post.status}`}><span className="status-dot" />{statusLabels[post.status]}</span></Button><div className="post-details"><div className="post-date"><CalendarDays />{format(parseISO(post.scheduled_date), 'dd/MM/yyyy')} às {post.scheduled_time.slice(0, 5)}</div><p className="post-caption">{post.caption || 'Sem legenda'}</p><div className="post-pain">{post.target_pain && <><Tag size={12} /><span title={post.target_pain}>{post.target_pain}</span></>}</div></div><div className="post-footer"><span className="created-label">Criado em {new Date(post.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span><div className="post-actions"><Button variant="ghost" size="icon" title="Copiar URL da imagem" aria-label="Copiar URL da imagem" onClick={() => copyImage(post)}><Copy /></Button><Button variant="ghost" size="icon" title="Editar data e horário" aria-label="Editar data e horário" onClick={() => { setEditing(post); setEditDate(post.scheduled_date); setEditTime(post.scheduled_time.slice(0,5)); }}><Pencil /></Button><Button variant="ghost" size="icon" title="Excluir post" aria-label="Excluir post" onClick={() => setRemoving(post)}><Trash2 /></Button></div></div></article>)}</div> : <div className="empty-state"><EmptyArt /><h3>{posts.length ? 'Nenhum post encontrado' : 'Sua agenda está pronta para começar'}</h3><p>{posts.length ? 'Nenhum agendamento corresponde à sua busca.' : 'Suas próximas ideias ganham um lugar aqui. Que tal preparar o primeiro post?'}</p></div>}</section></div><Dialog open={Boolean(editing)} onOpenChange={open => { if (!open && !busy) setEditing(null); }}><DialogContent><DialogHeader><DialogTitle>Editar agendamento</DialogTitle><DialogDescription>Escolha a nova data e o horário de publicação.</DialogDescription></DialogHeader><label className="field-label">Data de publicação</label><PostDatePicker value={editDate} onChange={setEditDate} /><label className="field-label" htmlFor="edit-time">Horário</label><Input id="edit-time" type="time" value={editTime} onChange={e => setEditTime(e.target.value)} /><div className="quick-times">{quickTimes.map(t => <Button variant="outline" key={t} onClick={() => setEditTime(t)}>{t}</Button>)}</div><Button onClick={update} disabled={busy}>{busy && <Loader2 className="animate-spin" />}Salvar alterações</Button></DialogContent></Dialog><AlertDialog open={Boolean(removing)} onOpenChange={open => { if (!open && !busy) setRemoving(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir este post?</AlertDialogTitle><AlertDialogDescription>O agendamento e a imagem serão removidos. Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel><Button variant="destructive" onClick={destroy} disabled={busy}>{busy && <Loader2 className="animate-spin" />}Excluir post</Button></AlertDialogFooter></AlertDialogContent></AlertDialog><Dialog open={Boolean(expanded)} onOpenChange={open => { if (!open) setExpanded(null); }}><DialogContent className="max-w-3xl"><DialogHeader><DialogTitle>Imagem do post</DialogTitle><DialogDescription>{expanded ? `${format(parseISO(expanded.scheduled_date), 'dd/MM/yyyy')} às ${expanded.scheduled_time.slice(0,5)}` : ''}</DialogDescription></DialogHeader>{expanded && <StoredImage post={expanded} className="image-dialog" />}</DialogContent></Dialog></>;
}
function StoredImage({ post, className }: { post: Post; className: string }) {
  const [url, setUrl] = useState('');
  useEffect(() => { let active = true; const path = post.image_url.split('/post-images/')[1]; if (!path) return; supabase.storage.from('post-images').createSignedUrl(path, 3600).then(({ data }) => { if (active) setUrl(data?.signedUrl || post.image_url); }); return () => { active = false; }; }, [post.image_url]);
  return url ? <img src={url} alt={post.caption?.slice(0,100) || 'Imagem do post agendado'} className={className} loading="lazy" /> : <Skeleton className={className} />;
}
