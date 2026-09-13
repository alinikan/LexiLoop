begin;
-- Private drafts, captures and self-assessed usage share the profile's owner-only RLS.
alter table public.profiles add column workspace jsonb not null default '{"sessions":{},"inbox":[],"usage":[]}'::jsonb;
alter function public.commit_learning_state(uuid,integer,jsonb) rename to commit_learning_state_v2;
create function public.commit_learning_state(p_user uuid,p_expected integer,p_state jsonb) returns void language plpgsql security definer set search_path=public as $$
begin
 perform public.commit_learning_state_v2(p_user,p_expected,p_state);
 if p_state ? 'workspace' then
  update profiles set workspace=p_state->'workspace' where id=p_user;
 end if;
end $$;
revoke all on function public.commit_learning_state(uuid,integer,jsonb),public.commit_learning_state_v2(uuid,integer,jsonb) from public,anon,authenticated;
grant execute on function public.commit_learning_state(uuid,integer,jsonb) to service_role;
commit;
