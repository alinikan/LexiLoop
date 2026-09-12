begin;
create table public.profiles(id uuid primary key references auth.users on delete cascade, revision integer not null default 0, settings jsonb not null, updated_at timestamptz not null default now());
create table public.words(word text primary key, content jsonb not null, created_at timestamptz not null default now());
create table public.word_meanings(word text references public.words on delete cascade, position integer, definition text not null, simple text not null, primary key(word,position));
create table public.word_examples(word text, meaning_position integer, position integer, sentence text not null, primary key(word,meaning_position,position), foreign key(word,meaning_position) references public.word_meanings on delete cascade);
create table public.user_words(user_id uuid references auth.users on delete cascade, word text references public.words, data jsonb not null, first_learned_at timestamptz, next_review_at timestamptz, archived boolean not null default false, primary key(user_id,word));
create index due_review_idx on public.user_words(user_id,next_review_at) where not archived;
create table public.daily_word_sets(user_id uuid references auth.users on delete cascade, day date, goal integer not null check(goal between 1 and 20), started boolean not null, data jsonb not null, primary key(user_id,day));
create table public.daily_word_set_items(user_id uuid, day date, word text references public.words, position integer not null, completed boolean not null, primary key(user_id,day,word), foreign key(user_id,day) references public.daily_word_sets on delete cascade);
create table public.review_events(id uuid primary key,user_id uuid not null references auth.users on delete cascade,word text references public.words,reviewed_at timestamptz not null,quality integer not null check(quality between 0 and 3),kind text not null check(kind in ('learn','review')),data jsonb not null);
create index review_history_idx on public.review_events(user_id,reviewed_at);
create table public.suggestion_feedback(user_id uuid references auth.users on delete cascade, word text not null,primary key(user_id,word));
create table public.generation_quotas(user_id uuid references auth.users on delete cascade,day date,used integer not null,primary key(user_id,day));
-- User-owned tables are readable only by their owner. All writes go through validated server commands.
alter table public.profiles enable row level security;
create policy own_profile on public.profiles for select to authenticated using(id=auth.uid());
do $$ declare tab text; begin foreach tab in array array['user_words','daily_word_sets','daily_word_set_items','review_events','suggestion_feedback','generation_quotas'] loop execute format('alter table public.%I enable row level security',tab); execute format('create policy own_read on public.%I for select to authenticated using(user_id=auth.uid())',tab); end loop; end $$;
do $$ declare tab text; begin foreach tab in array array['words','word_meanings','word_examples'] loop execute format('alter table public.%I enable row level security',tab);execute format('create policy lexical_read on public.%I for select to authenticated using(true)',tab);end loop;end $$;
grant select on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
create function public.cache_lexical_word(p_content jsonb) returns void language plpgsql security definer set search_path=public as $$
declare m jsonb; ex jsonb; mi integer:=0; ei integer; w text:=p_content->>'word';
begin
 insert into words(word,content) values(w,p_content) on conflict(word) do nothing;
 if not found then return; end if;
 for m in select value from jsonb_array_elements(p_content->'meanings') loop
 insert into word_meanings values(w,mi,m->>'definition',m->>'simple');ei:=0;
 for ex in select value from jsonb_array_elements(m->'examples') loop insert into word_examples values(w,mi,ei,ex#>>'{}');ei:=ei+1;end loop;mi:=mi+1;
 end loop;
end $$;
create function public.consume_generation_quota(p_user uuid) returns boolean language plpgsql security definer set search_path=public as $$
declare count_used integer;
begin insert into generation_quotas values(p_user,(now() at time zone 'UTC')::date,1) on conflict(user_id,day) do update set used=generation_quotas.used+1 where generation_quotas.used<20 returning used into count_used;return count_used is not null;end $$;
create function public.commit_learning_state(p_user uuid,p_expected integer,p_state jsonb) returns void language plpgsql security definer set search_path=public as $$
declare current_revision integer; item jsonb; d jsonb; e jsonb; w jsonb; pos integer;
begin
 insert into profiles(id,settings) values(p_user,p_state->'settings') on conflict(id) do nothing;
 select revision into current_revision from profiles where id=p_user for update;
 if current_revision<>p_expected then raise exception 'revision_conflict'; end if;
 update profiles set settings=p_state->'settings',revision=(p_state->>'version')::integer,updated_at=now() where id=p_user;
 for item in select value from jsonb_array_elements(p_state->'words') loop
 insert into user_words(user_id,word,data,first_learned_at,next_review_at,archived) values(p_user,item->>'word',item,(item#>>'{schedule,firstLearned}')::timestamptz,(item#>>'{schedule,nextReview}')::timestamptz,(item->>'archived')::boolean)
 on conflict(user_id,word) do update set data=excluded.data,first_learned_at=excluded.first_learned_at,next_review_at=excluded.next_review_at,archived=excluded.archived;
 end loop;
 for d in select value from jsonb_array_elements(p_state->'days') loop
 insert into daily_word_sets values(p_user,(d->>'date')::date,(d->>'goal')::integer,(d->>'started')::boolean,d) on conflict(user_id,day) do update set goal=excluded.goal,started=excluded.started,data=excluded.data;
 delete from daily_word_set_items where user_id=p_user and day=(d->>'date')::date;pos:=0;
 for w in select value from jsonb_array_elements(d->'words') loop insert into daily_word_set_items values(p_user,(d->>'date')::date,w#>>'{}',pos,(d->'completed') ? (w#>>'{}'));pos:=pos+1;end loop;
 end loop;
 for e in select value from jsonb_array_elements(p_state->'events') loop insert into review_events values((e->>'id')::uuid,p_user,e->>'word',(e->>'at')::timestamptz,(e->>'quality')::integer,e->>'kind',e) on conflict(id) do nothing;end loop;
 for w in select value from jsonb_array_elements(p_state->'dismissed') loop insert into suggestion_feedback values(p_user,w#>>'{}') on conflict do nothing;end loop;
end $$;
revoke all on function public.cache_lexical_word(jsonb),public.consume_generation_quota(uuid),public.commit_learning_state(uuid,integer,jsonb) from public,anon,authenticated;
grant execute on function public.cache_lexical_word(jsonb),public.consume_generation_quota(uuid),public.commit_learning_state(uuid,integer,jsonb) to service_role;
commit;
