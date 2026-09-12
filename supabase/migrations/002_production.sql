begin;
-- Account creation initializes private settings even before the first lesson.
create function public.initialize_profile() returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into profiles(id,settings) values(new.id,jsonb_build_object('goal',5,'level','B1','interests',jsonb_build_array('Everyday','Workplace'),'reminder',false,'reminderTime','09:00','timezone','UTC','onboarded',false,'dark',false,'displayName',left(coalesce(new.raw_user_meta_data->>'display_name',''),60),'reducedMotion',false)) on conflict(id) do nothing;
 return new;
end $$;
create trigger initialize_lexiloop_profile after insert on auth.users for each row execute function public.initialize_profile();
revoke all on function public.initialize_profile() from public,anon,authenticated;
-- Aggregate in PostgreSQL rather than transferring a user's full review history.
create function public.learning_summary(p_today date) returns jsonb language sql stable security invoker set search_path=public as $$
with daily as (
 select (data->>'date')::date as practice_day,count(*) amount from review_events where user_id=auth.uid() group by 1
), numbered as (
 select practice_day,practice_day-(row_number() over(order by practice_day))::integer grp from daily
), runs as (
 select min(practice_day) first,max(practice_day) last,count(*) length from numbered group by grp
), totals as (
 select count(*) n,count(*) filter(where quality>=2) correct,count(*) filter(where kind='review') reviews,coalesce(sum(case when kind='learn' then 20 else 10 end),0) xp from review_events where user_id=auth.uid()
)
select jsonb_build_object('reviews',reviews,'accuracy',case when n=0 then 0 else round(correct*100.0/n) end,'xp',xp,
 'longest',coalesce((select max(length) from runs),0),
 'streak',coalesce((select length from runs where last in(p_today,p_today-1) order by last desc limit 1),0),
 'completedDays',(select count(*) from daily_word_sets where user_id=auth.uid() and jsonb_array_length(data->'completed')=goal),
 'activity',coalesce((select jsonb_object_agg(practice_day,amount) from daily where practice_day>=p_today-6 and practice_day<=p_today),'{}'::jsonb)) from totals;
$$;
revoke all on function public.learning_summary(date) from public,anon;
grant execute on function public.learning_summary(date) to authenticated;
-- Leases prevent concurrent cache misses for one word from causing duplicate API bills.
create table public.word_generation_leases(word text primary key,token uuid not null,expires_at timestamptz not null);
alter table public.word_generation_leases enable row level security;
create function public.claim_word_generation(p_word text,p_token uuid) returns boolean language plpgsql security definer set search_path=public as $$
begin
 insert into word_generation_leases values(p_word,p_token,now()+interval '90 seconds') on conflict(word) do update set token=excluded.token,expires_at=excluded.expires_at where word_generation_leases.expires_at<now();
 return found;
end $$;
create function public.release_word_generation(p_word text,p_token uuid) returns void language sql security definer set search_path=public as $$ delete from word_generation_leases where word=p_word and token=p_token $$;
revoke all on function public.claim_word_generation(text,uuid),public.release_word_generation(text,uuid) from public,anon,authenticated;
grant execute on function public.claim_word_generation(text,uuid),public.release_word_generation(text,uuid) to service_role;
create table public.dictionary_quotas(user_id uuid references auth.users on delete cascade,day date,used integer not null,primary key(user_id,day));
alter table public.dictionary_quotas enable row level security;
create function public.consume_dictionary_quota(p_user uuid) returns boolean language plpgsql security definer set search_path=public as $$
declare n integer; begin insert into dictionary_quotas values(p_user,(now() at time zone 'UTC')::date,1) on conflict(user_id,day) do update set used=dictionary_quotas.used+1 where dictionary_quotas.used<100 returning used into n; return n is not null; end $$;
revoke all on function public.consume_dictionary_quota(uuid) from public,anon,authenticated;
grant execute on function public.consume_dictionary_quota(uuid) to service_role;
create table public.word_aliases(alias text primary key,word text not null references public.words on delete cascade);
alter table public.word_aliases enable row level security;
create policy read_aliases on public.word_aliases for select to authenticated using(true);
grant select on public.word_aliases to authenticated;
grant select on public.word_aliases to service_role;
create function public.cache_generated_word(p_content jsonb,p_input text) returns void language plpgsql security definer set search_path=public as $$
begin
 perform cache_lexical_word(p_content);
 insert into word_aliases values(p_input,p_content->>'word') on conflict(alias) do nothing;
end $$;
revoke all on function public.cache_generated_word(jsonb,text) from public,anon,authenticated;
grant execute on function public.cache_generated_word(jsonb,text) to service_role;
-- The migration ledger contains operational metadata, not client data.
do $$ begin if to_regclass('public.lexiloop_migrations') is not null then
 alter table public.lexiloop_migrations enable row level security;
 revoke all on public.lexiloop_migrations from anon,authenticated;
end if; end $$;
commit;
