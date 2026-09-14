begin;
-- Keep the existing revision lock, event history and private workspace transaction.
alter function public.commit_learning_state(uuid,integer,jsonb) rename to commit_learning_state_v3;
create function public.commit_learning_state(p_user uuid,p_expected integer,p_state jsonb) returns void language plpgsql security definer set search_path=public as $$
begin
 perform public.commit_learning_state_v3(p_user,p_expected,p_state);
 delete from public.user_words where user_id=p_user and word in
 (select jsonb_array_elements_text(coalesce(p_state->'removed_words','[]'::jsonb)));
end $$;
revoke all on function public.commit_learning_state(uuid,integer,jsonb), public.commit_learning_state_v3(uuid,integer,jsonb) from public,anon,authenticated;
grant execute on function public.commit_learning_state(uuid,integer,jsonb) to service_role;
notify pgrst, 'reload schema';
commit;
