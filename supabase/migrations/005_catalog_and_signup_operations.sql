begin;

-- Searchable metadata keeps the 5,000 full lessons in PostgreSQL instead of sending
-- the entire library to every browser. Existing lesson JSON remains canonical.
alter table public.words add column normalized_word text;
alter table public.words add column part_of_speech text;
alter table public.words add column difficulty text;
alter table public.words add column usefulness integer;
alter table public.words add column categories text[];
alter table public.words add column definition text;
alter table public.words add column source text not null default 'generated';
alter table public.words add column frequency_rank integer;
alter table public.words add column published boolean not null default true;

update public.words set
 normalized_word=lower(word),
 part_of_speech=content->>'partOfSpeech',
 difficulty=content->>'difficulty',
 usefulness=(content->>'usefulness')::integer,
 categories=array(select jsonb_array_elements_text(content->'categories')),
 definition=content#>>'{meanings,0,definition}'
where normalized_word is null;

alter table public.words alter column normalized_word set not null;
alter table public.words alter column part_of_speech set not null;
alter table public.words alter column difficulty set not null;
alter table public.words alter column usefulness set not null;
alter table public.words alter column categories set not null;
alter table public.words alter column definition set not null;
alter table public.words add constraint words_difficulty_check check(difficulty in ('A2','B1','B2','C1'));
alter table public.words add constraint words_usefulness_check check(usefulness between 1 and 100);
alter table public.words add constraint words_source_check check(source in ('editorial','wordnet-wordfreq','generated'));

create index words_discovery_idx on public.words(published,difficulty,usefulness desc,frequency_rank,word);
create index words_normalized_idx on public.words(normalized_word text_pattern_ops);
create index words_categories_idx on public.words using gin(categories);

create or replace function public.cache_lexical_word(p_content jsonb) returns void language plpgsql security definer set search_path=public as $$
declare m jsonb; ex jsonb; mi integer:=0; ei integer; w text:=p_content->>'word';
begin
 insert into words(word,content,normalized_word,part_of_speech,difficulty,usefulness,categories,definition,source)
 values(
  w,p_content,lower(w),p_content->>'partOfSpeech',p_content->>'difficulty',
  (p_content->>'usefulness')::integer,
  array(select jsonb_array_elements_text(p_content->'categories')),
  p_content#>>'{meanings,0,definition}','generated'
 ) on conflict(word) do nothing;
 if not found then return; end if;
 for m in select value from jsonb_array_elements(p_content->'meanings') loop
  insert into word_meanings values(w,mi,m->>'definition',m->>'simple');ei:=0;
  for ex in select value from jsonb_array_elements(m->'examples') loop
   insert into word_examples values(w,mi,ei,ex#>>'{}');ei:=ei+1;
  end loop;mi:=mi+1;
 end loop;
end $$;

-- One database round trip seeds a batch while preserving any lesson content learners
-- have already used. Metadata is refreshed from that preserved canonical content.
create function public.seed_lexical_batch(p_entries jsonb) returns integer language plpgsql security definer set search_path=public as $$
declare entry jsonb; n integer:=0;
begin
 for entry in select value from jsonb_array_elements(p_entries) loop
  perform public.cache_lexical_word(entry->'content');
  update public.words as stored set
   normalized_word=entry->>'normalizedWord',
   part_of_speech=stored.content->>'partOfSpeech',
   difficulty=stored.content->>'difficulty',
   usefulness=(stored.content->>'usefulness')::integer,
   categories=array(select jsonb_array_elements_text(stored.content->'categories')),
   definition=stored.content#>>'{meanings,0,definition}',
   source=entry->>'source',
   frequency_rank=nullif(entry->>'frequencyRank','')::integer,
   published=true
  where stored.word=entry#>>'{content,word}';
  n:=n+1;
 end loop;
 return n;
end $$;
revoke all on function public.seed_lexical_batch(jsonb) from public,anon,authenticated;
grant execute on function public.seed_lexical_batch(jsonb) to service_role;

-- A confirmation event contains no email address. The protected notification worker
-- retrieves it through the server-only Auth admin API immediately before sending.
create table public.signup_events(
 user_id uuid primary key references auth.users on delete cascade,
 confirmed_at timestamptz not null,
 notified_at timestamptz,
 processing_at timestamptz,
 attempts integer not null default 0,
 last_error text
);
alter table public.signup_events enable row level security;
grant all on public.signup_events to service_role;

create function public.claim_signup_notification(p_user uuid) returns boolean
language plpgsql security definer set search_path=public as $$
declare claimed boolean;
begin
 update signup_events set processing_at=now(),attempts=attempts+1,last_error=null
 where user_id=p_user and notified_at is null
   and (processing_at is null or processing_at < now()-interval '10 minutes')
 returning true into claimed;
 return coalesce(claimed,false);
end $$;
revoke all on function public.claim_signup_notification(uuid) from public,anon,authenticated;
grant execute on function public.claim_signup_notification(uuid) to service_role;

create function public.capture_confirmed_signup() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.email_confirmed_at is not null and
    (tg_op='INSERT' or old.email_confirmed_at is null) then
  insert into public.signup_events(user_id,confirmed_at)
  values(new.id,new.email_confirmed_at) on conflict(user_id) do nothing;
 end if;
 return new;
end $$;
create trigger capture_lexiloop_confirmed_signup
after insert or update of email_confirmed_at on auth.users
for each row execute function public.capture_confirmed_signup();
revoke all on function public.capture_confirmed_signup() from public,anon,authenticated;

notify pgrst, 'reload schema';
commit;
