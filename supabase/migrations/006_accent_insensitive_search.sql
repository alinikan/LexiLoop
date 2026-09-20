begin;

-- Keep database search keys aligned with lib/validation/word.ts. PostgreSQL does
-- not normalize accents by default, so generated words such as “naïve” need an
-- explicit Latin-letter fold to remain findable as either “naïve” or “naive”.
create function public.lexiloop_normalize_word(p_word text) returns text
language plpgsql immutable strict set search_path=public as $$
declare normalized text:=lower(p_word);
begin
 normalized:=replace(replace(normalized,chr(8217),chr(39)),chr(8216),chr(39));
 normalized:=replace(replace(replace(normalized,'æ','ae'),'œ','oe'),'ß','ss');
 normalized:=translate(normalized,'áàâäãåāăą','aaaaaaaaa');
 normalized:=translate(normalized,'çćčĉċ','ccccc');
 normalized:=translate(normalized,'ďđð','ddd');
 normalized:=translate(normalized,'éèêëēėęě','eeeeeeee');
 normalized:=translate(normalized,'ģğĝġ','gggg');
 normalized:=translate(normalized,'ĥħ','hh');
 normalized:=translate(normalized,'íìîïīįı','iiiiiii');
 normalized:=translate(normalized,'ĵ','j');
 normalized:=translate(normalized,'ķ','k');
 normalized:=translate(normalized,'łľĺļŀ','lllll');
 normalized:=translate(normalized,'ñńňņŋ','nnnnn');
 normalized:=translate(normalized,'óòôöõøōő','oooooooo');
 normalized:=translate(normalized,'řŕŗ','rrr');
 normalized:=translate(normalized,'śšşŝ','ssss');
 normalized:=translate(normalized,'ťţŧ','ttt');
 normalized:=translate(normalized,'úùûüūůűų','uuuuuuuu');
 normalized:=translate(normalized,'ŵ','w');
 normalized:=translate(normalized,'ýÿŷ','yyy');
 normalized:=translate(normalized,'žźż','zzz');
 return regexp_replace(trim(normalized),'[[:space:]]+',' ','g');
end $$;
revoke all on function public.lexiloop_normalize_word(text) from public,anon,authenticated;
grant execute on function public.lexiloop_normalize_word(text) to service_role;

create function public.sync_lexical_search_key() returns trigger
language plpgsql set search_path=public as $$
begin
 new.normalized_word:=public.lexiloop_normalize_word(new.word);
 return new;
end $$;
revoke all on function public.sync_lexical_search_key() from public,anon,authenticated;
grant execute on function public.sync_lexical_search_key() to service_role;

create trigger sync_lexical_search_key
before insert or update of word,normalized_word on public.words
for each row execute function public.sync_lexical_search_key();

update public.words
set normalized_word=public.lexiloop_normalize_word(word)
where normalized_word is distinct from public.lexiloop_normalize_word(word);

notify pgrst, 'reload schema';
commit;
