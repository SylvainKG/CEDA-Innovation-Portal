-- 012: whitespace-only answers count as empty (frontend review of PR #16).
--
-- private.validate_submission trimmed answers with btrim(), which strips only
-- spaces. An answer made of newlines or tabs therefore passed the "Required"
-- check on submit and on revision, while the browser's check (String.trim)
-- refused it. The answer is now trimmed of all whitespace before the required,
-- length, option and email checks. The rest of the function is copied unchanged
-- from 002; create or replace keeps its grants (none: it is internal).

create or replace function private.validate_submission(p_schema jsonb, p_required_docs jsonb, p_data jsonb, p_proposal_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_errors jsonb := '{}'::jsonb;
  v_field  jsonb;
  v_doc    jsonb;
  v_key    text;
  v_val    text;
  v_max    integer;
begin
  for v_field in select * from private.form_fields(p_schema) loop
    v_key := v_field ->> 'key';
    -- Trim all leading/trailing whitespace (btrim alone strips only spaces, so a newline passed "Required").
    v_val := regexp_replace(coalesce(p_data ->> v_key, ''), '^[[:space:]]+|[[:space:]]+$', '', 'g');
    v_max := (v_field ->> 'max_length')::integer;

    if coalesce((v_field ->> 'required')::boolean, false) and v_val = '' then
      v_errors := v_errors || jsonb_build_object(v_key, 'Required');
    elsif v_max is not null and char_length(v_val) > v_max then
      v_errors := v_errors || jsonb_build_object(v_key, format('Use %s characters or fewer', v_max));
    elsif v_val <> '' and v_field ->> 'type' = 'select'
          and not (coalesce(v_field -> 'options', '[]'::jsonb) ? v_val) then
      v_errors := v_errors || jsonb_build_object(v_key, 'Choose one of the listed options');
    elsif v_val <> '' and v_field ->> 'type' = 'email'
          and v_val !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
      v_errors := v_errors || jsonb_build_object(v_key, 'Enter a valid email address');
    end if;
  end loop;

  for v_doc in select * from jsonb_array_elements(coalesce(p_required_docs, '[]'::jsonb)) loop
    if coalesce((v_doc ->> 'required')::boolean, false) and not exists (
      select 1 from public.attachments a
      where a.proposal_id = p_proposal_id and a.version_id is null and a.deleted_at is null
        and a.doc_key = v_doc ->> 'key'
    ) then
      v_errors := v_errors || jsonb_build_object('doc:' || (v_doc ->> 'key'), 'Attach this document');
    end if;
  end loop;

  return v_errors;
end;
$$;
