CREATE TABLE public.scheduled_posts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL DEFAULT auth.uid(),
 image_url text NOT NULL,
 caption text CHECK (char_length(caption) <= 2200),
 target_pain text CHECK (char_length(target_pain) <= 200),
 scheduled_date date NOT NULL,
 scheduled_time time NOT NULL,
 status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','publicado','erro')),
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scheduled_posts TO authenticated;
GRANT ALL ON public.scheduled_posts TO service_role;
ALTER TABLE public.scheduled_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own posts" ON public.scheduled_posts FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Create own posts" ON public.scheduled_posts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND status = 'pendente');
CREATE POLICY "Edit own posts" ON public.scheduled_posts FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Delete own posts" ON public.scheduled_posts FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE INDEX scheduled_posts_owner_created ON public.scheduled_posts(user_id, created_at DESC);
CREATE FUNCTION public.validate_post_date() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN IF (TG_OP = 'INSERT' OR NEW.scheduled_date IS DISTINCT FROM OLD.scheduled_date OR NEW.scheduled_time IS DISTINCT FROM OLD.scheduled_time) AND NEW.scheduled_date < (now() AT TIME ZONE 'America/Sao_Paulo')::date THEN RAISE EXCEPTION 'A data não pode ser anterior a hoje'; END IF; RETURN NEW; END; $$;
CREATE TRIGGER validate_scheduled_date BEFORE INSERT OR UPDATE ON public.scheduled_posts FOR EACH ROW EXECUTE FUNCTION public.validate_post_date();
CREATE POLICY "Upload own images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'post-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Read own stored images" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'post-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Delete own stored images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'post-images' AND (storage.foldername(name))[1] = auth.uid()::text);