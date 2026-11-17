-- =============================================================================
-- Migration 008 — Slice 6b: admin settings (T12)
-- ADM-01 (publish challenge, form, documents), ADM-02 (edit / unpublish /
-- delete unused drafts; cases keep their form version), HLP-01 (admin-editable
-- FAQs, contacts, referrals), CHT-02 (hours, closures, demo override),
-- ARC-01 (new role and new criterion through settings, no code change).
-- Contract: docs/blueprint/03-api-contracts-and-permissions.md §4.7
-- =============================================================================

create or replace function private.require_config()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.has_permission('config.manage') then
    perform private.raise_error('FORBIDDEN', 'You don''t have access to this action.');
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- HLP-01: content pages
-- -----------------------------------------------------------------------------

create or replace function public.save_content_page(
  p_slug text, p_kind text, p_title text, p_body_md text,
  p_status text default 'draft', p_position integer default 0,
  p_is_sample boolean default true, p_version text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old public.content_pages%rowtype;
  v_id  uuid;
begin
  perform private.require_config();
  if p_slug is null or p_slug !~ '^[a-z0-9][a-z0-9-]{1,80}$' then
    perform private.raise_error('VALIDATION', 'Use lowercase letters, numbers and hyphens for the address.',
      jsonb_build_object('fields', jsonb_build_object('slug', 'Lowercase letters, numbers and hyphens')));
  end if;
  if p_kind is null or p_kind not in ('faq','contact','referral','support','privacy','declaration','page') then
    perform private.raise_error('VALIDATION', 'Choose a page type.', jsonb_build_object('fields', jsonb_build_object('kind', 'Unknown type')));
  end if;
  if p_status not in ('draft', 'published') then
    perform private.raise_error('VALIDATION', 'Choose draft or published.', jsonb_build_object('fields', jsonb_build_object('status', 'Unknown status')));
  end if;
  perform private.require_text(p_title, 'title', 1, 200, 'Give a title (up to 200 characters).');
  if char_length(coalesce(p_body_md, '')) > 20000 then
    perform private.raise_error('VALIDATION', 'The text is too long.', jsonb_build_object('fields', jsonb_build_object('body_md', 'Up to 20,000 characters')));
  end if;

  select * into v_old from public.content_pages c where c.slug = p_slug for update;
  if v_old.id is not null and v_old.kind <> p_kind then
    perform private.raise_error('VALIDATION', 'A page cannot change type.', jsonb_build_object('fields', jsonb_build_object('kind', 'Cannot change')));
  end if;
  -- Consent and declarations are stored with the wording version: new wording needs a new version.
  if p_kind in ('privacy', 'declaration') then
    if btrim(coalesce(p_version, '')) = '' then
      perform private.raise_error('VALIDATION', 'Give this wording a version.', jsonb_build_object('fields', jsonb_build_object('version', 'Required')));
    end if;
    if v_old.id is not null and v_old.body_md is distinct from p_body_md and v_old.version = p_version then
      perform private.raise_error('VALIDATION', 'Changed wording needs a new version, so earlier consents stay traceable.',
        jsonb_build_object('fields', jsonb_build_object('version', 'Use a new version')));
    end if;
  end if;

  insert into public.content_pages (slug, kind, title, body_md, version, position, is_sample, status, updated_by)
  values (p_slug, p_kind, btrim(p_title), coalesce(p_body_md, ''), nullif(btrim(coalesce(p_version, '')), ''),
          coalesce(p_position, 0), coalesce(p_is_sample, true), p_status, auth.uid())
  on conflict (slug) do update set
    title = excluded.title, body_md = excluded.body_md, version = excluded.version, position = excluded.position,
    is_sample = excluded.is_sample, status = excluded.status, updated_by = excluded.updated_by
  returning id into v_id;

  perform private.write_audit('content.saved', 'content_page', v_id::text, null,
    jsonb_build_object('slug', p_slug, 'kind', p_kind, 'status', p_status, 'version', p_version), private.acting_role('config.manage'));
  return jsonb_build_object('id', v_id, 'slug', p_slug, 'status', p_status);
end;
$$;

-- -----------------------------------------------------------------------------
-- CHT-02: hours, closures, demo override
-- -----------------------------------------------------------------------------

create or replace function public.set_service_hours(p_weekday integer, p_is_working boolean, p_opens_at time, p_closes_at time)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_config();
  if p_weekday is null or p_weekday not between 1 and 7 or p_is_working is null
     or p_opens_at is null or p_closes_at is null or p_opens_at >= p_closes_at then
    perform private.raise_error('VALIDATION', 'Choose a day, and an opening time before the closing time.');
  end if;
  insert into public.service_calendar (weekday, is_working, opens_at, closes_at)
  values (p_weekday, p_is_working, p_opens_at, p_closes_at)
  on conflict (weekday) do update set is_working = excluded.is_working, opens_at = excluded.opens_at, closes_at = excluded.closes_at;
  perform private.write_audit('settings.hours_changed', 'service_calendar', p_weekday::text, null,
    jsonb_build_object('is_working', p_is_working, 'opens_at', p_opens_at, 'closes_at', p_closes_at), private.acting_role('config.manage'));
  return jsonb_build_object('weekday', p_weekday, 'is_working', p_is_working);
end;
$$;

create or replace function public.set_service_closure(p_day date, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_config();
  if p_day is null then
    perform private.raise_error('VALIDATION', 'Choose a date.');
  end if;
  if p_reason is null then
    delete from public.service_closures where day = p_day;
  else
    insert into public.service_closures (day, reason)
    values (p_day, private.require_text(p_reason, 'reason', 1, 200, 'Give a reason (up to 200 characters).'))
    on conflict (day) do update set reason = excluded.reason;
  end if;
  perform private.write_audit('settings.closure_changed', 'service_closures', p_day::text, null,
    jsonb_build_object('closed', p_reason is not null), private.acting_role('config.manage'));
  return jsonb_build_object('day', p_day, 'closed', p_reason is not null);
end;
$$;

create or replace function public.set_chat_override(p_mode text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_config();
  if p_mode is not null and p_mode not in ('open', 'closed') then
    perform private.raise_error('VALIDATION', 'Choose open, closed, or none.');
  end if;
  update public.app_settings set value = coalesce(to_jsonb(p_mode), 'null'::jsonb), updated_at = now()
  where key = 'chat_demo_override';
  perform private.write_audit('settings.chat_override', 'app_settings', 'chat_demo_override', null,
    jsonb_build_object('mode', p_mode), private.acting_role('config.manage'));
  return jsonb_build_object('mode', p_mode, 'open', private.chat_is_open());
end;
$$;

-- -----------------------------------------------------------------------------
-- ARC-01: new roles as data. System roles keep their permission sets.
-- -----------------------------------------------------------------------------

create or replace function private.check_permissions(p_permissions text[])
returns text[]
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_bad text;
begin
  select x into v_bad from unnest(coalesce(p_permissions, array[]::text[])) x
  where not exists (select 1 from public.permissions p where p.key = x) limit 1;
  if v_bad is not null then
    perform private.raise_error('VALIDATION', 'Choose permissions from the list.',
      jsonb_build_object('fields', jsonb_build_object('permissions', 'Unknown permission: ' || v_bad)));
  end if;
  return (select coalesce(array_agg(distinct x), array[]::text[]) from unnest(coalesce(p_permissions, array[]::text[])) x);
end;
$$;

create or replace function public.create_role(
  p_key text, p_label text, p_permissions text[], p_requires_mfa boolean default true)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_perms text[];
begin
  if not private.has_permission('role.manage') then
    perform private.raise_error('FORBIDDEN', 'You don''t have access to this action.');
  end if;
  if p_key is null or p_key !~ '^[a-z][a-z0-9_]{1,40}$' then
    perform private.raise_error('VALIDATION', 'Use lowercase letters, numbers and underscores for the role key.',
      jsonb_build_object('fields', jsonb_build_object('key', 'Lowercase letters, numbers and underscores')));
  end if;
  if exists (select 1 from public.roles r where r.key = p_key) then
    perform private.raise_error('VALIDATION', 'A role with this key already exists.',
      jsonb_build_object('fields', jsonb_build_object('key', 'Already exists')));
  end if;
  perform private.require_text(p_label, 'label', 1, 80, 'Give the role a name (up to 80 characters).');
  v_perms := private.check_permissions(p_permissions);

  insert into public.roles (key, label, is_system, requires_mfa) values (p_key, btrim(p_label), false, coalesce(p_requires_mfa, true));
  insert into public.role_permissions (role_key, permission) select p_key, x from unnest(v_perms) x;

  perform private.write_audit('role.created', 'role', p_key, null,
    jsonb_build_object('permissions', v_perms, 'requires_mfa', coalesce(p_requires_mfa, true)), private.acting_role('role.manage'));
  return jsonb_build_object('key', p_key, 'permissions', to_jsonb(v_perms));
end;
$$;

create or replace function public.set_role_permissions(p_role_key text, p_permissions text[])
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role  public.roles%rowtype;
  v_perms text[];
begin
  if not private.has_permission('role.manage') then
    perform private.raise_error('FORBIDDEN', 'You don''t have access to this action.');
  end if;
  select * into v_role from public.roles r where r.key = p_role_key;
  if v_role.key is null then
    perform private.raise_error('VALIDATION', 'Choose a role.', jsonb_build_object('fields', jsonb_build_object('role_key', 'Unknown role')));
  end if;
  if v_role.is_system then
    perform private.raise_error('INVALID_STATE', 'Built-in roles keep their permissions. Create a new role instead.');
  end if;
  v_perms := private.check_permissions(p_permissions);

  delete from public.role_permissions where role_key = p_role_key;
  insert into public.role_permissions (role_key, permission) select p_role_key, x from unnest(v_perms) x;

  perform private.write_audit('role.permissions_changed', 'role', p_role_key, null,
    jsonb_build_object('permissions', v_perms), private.acting_role('role.manage'));
  return jsonb_build_object('key', p_role_key, 'permissions', to_jsonb(v_perms));
end;
$$;

-- -----------------------------------------------------------------------------
-- REV-02 / ARC-01: rubric drafts and criteria
-- -----------------------------------------------------------------------------

create or replace function public.create_rubric(p_key text, p_title text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id  uuid;
  v_ver uuid;
begin
  perform private.require_config();
  if p_key is null or p_key !~ '^[a-z0-9][a-z0-9-]{1,80}$' or exists (select 1 from public.rubrics r where r.key = p_key) then
    perform private.raise_error('VALIDATION', 'Use a new key of lowercase letters, numbers and hyphens.',
      jsonb_build_object('fields', jsonb_build_object('key', 'Invalid or already used')));
  end if;
  insert into public.rubrics (key, title) values (p_key, private.require_text(p_title, 'title', 1, 200, 'Give a title.'))
  returning id into v_id;
  insert into public.rubric_versions (rubric_id, version_no) values (v_id, 1) returning id into v_ver;
  perform private.write_audit('rubric.created', 'rubric', v_id::text, null, jsonb_build_object('key', p_key), private.acting_role('config.manage'));
  return jsonb_build_object('rubric_id', v_id, 'rubric_version_id', v_ver, 'version_no', 1);
end;
$$;

-- A new draft version, starting from the latest version's criteria. Returns the open draft if there is one.
create or replace function public.create_rubric_draft(p_rubric_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_latest public.rubric_versions%rowtype;
  v_new    uuid;
begin
  perform private.require_config();
  select * into v_latest from public.rubric_versions v where v.rubric_id = p_rubric_id order by v.version_no desc limit 1 for update;
  if v_latest.id is null then
    perform private.raise_error('VALIDATION', 'Choose a rubric.');
  end if;
  if v_latest.published_at is null then
    return jsonb_build_object('rubric_version_id', v_latest.id, 'version_no', v_latest.version_no, 'existing', true);
  end if;
  insert into public.rubric_versions (rubric_id, version_no) values (p_rubric_id, v_latest.version_no + 1) returning id into v_new;
  insert into public.rubric_criteria (rubric_version_id, key, label, weight, min_score, max_score, anchors, guidance, position)
  select v_new, c.key, c.label, c.weight, c.min_score, c.max_score, c.anchors, c.guidance, c.position
  from public.rubric_criteria c where c.rubric_version_id = v_latest.id;
  perform private.write_audit('rubric.draft_created', 'rubric_version', v_new::text, null,
    jsonb_build_object('version_no', v_latest.version_no + 1), private.acting_role('config.manage'));
  return jsonb_build_object('rubric_version_id', v_new, 'version_no', v_latest.version_no + 1, 'existing', false);
end;
$$;

create or replace function private.rubric_draft(p_rubric_version_id uuid)
returns public.rubric_versions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.rubric_versions%rowtype;
begin
  select * into v from public.rubric_versions r where r.id = p_rubric_version_id for update;
  if v.id is null then
    perform private.raise_error('VALIDATION', 'Choose a rubric version.');
  end if;
  if v.published_at is not null then
    perform private.raise_error('INVALID_STATE', 'This version is published and locked. Create a new draft.');
  end if;
  return v;
end;
$$;

create or replace function public.save_rubric_criterion(
  p_rubric_version_id uuid, p_key text, p_label text, p_weight numeric, p_anchors jsonb,
  p_guidance text default '', p_position integer default 0)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_errors jsonb := '{}'::jsonb;
begin
  perform private.require_config();
  perform private.rubric_draft(p_rubric_version_id);
  if p_key is null or p_key !~ '^[a-z][a-z0-9_]{1,40}$' then
    v_errors := v_errors || jsonb_build_object('key', 'Lowercase letters, numbers and underscores');
  end if;
  if char_length(btrim(coalesce(p_label, ''))) not between 1 and 120 then
    v_errors := v_errors || jsonb_build_object('label', 'Give a name (up to 120 characters)');
  end if;
  if p_weight is null or p_weight <= 0 or p_weight > 100 then
    v_errors := v_errors || jsonb_build_object('weight', 'Between 0 and 100');
  end if;
  -- D-20: anchors for 1, 3 and 5 at least.
  if p_anchors is null or jsonb_typeof(p_anchors) <> 'object'
     or btrim(coalesce(p_anchors ->> '1', '')) = '' or btrim(coalesce(p_anchors ->> '3', '')) = ''
     or btrim(coalesce(p_anchors ->> '5', '')) = '' then
    v_errors := v_errors || jsonb_build_object('anchors', 'Describe scores 1, 3 and 5');
  end if;
  if v_errors <> '{}'::jsonb then
    perform private.raise_error('VALIDATION', 'Some details need attention.', jsonb_build_object('fields', v_errors));
  end if;

  insert into public.rubric_criteria (rubric_version_id, key, label, weight, anchors, guidance, position)
  values (p_rubric_version_id, p_key, btrim(p_label), p_weight, p_anchors, coalesce(p_guidance, ''), coalesce(p_position, 0))
  on conflict (rubric_version_id, key) do update set
    label = excluded.label, weight = excluded.weight, anchors = excluded.anchors,
    guidance = excluded.guidance, position = excluded.position;

  return jsonb_build_object('rubric_version_id', p_rubric_version_id, 'key', p_key,
    'weights_total', (select sum(c.weight) from public.rubric_criteria c where c.rubric_version_id = p_rubric_version_id));
end;
$$;

create or replace function public.remove_rubric_criterion(p_rubric_version_id uuid, p_key text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_config();
  perform private.rubric_draft(p_rubric_version_id);
  delete from public.rubric_criteria where rubric_version_id = p_rubric_version_id and key = p_key;
  return jsonb_build_object('rubric_version_id', p_rubric_version_id,
    'weights_total', (select coalesce(sum(c.weight), 0) from public.rubric_criteria c where c.rubric_version_id = p_rubric_version_id));
end;
$$;

create or replace function public.publish_rubric_version(p_rubric_version_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_total numeric;
begin
  perform private.require_config();
  perform private.rubric_draft(p_rubric_version_id);
  select coalesce(sum(c.weight), 0) into v_total from public.rubric_criteria c where c.rubric_version_id = p_rubric_version_id;
  if v_total <> 100 then
    perform private.raise_error('VALIDATION', format('Weights must total 100%% (now %s%%).', v_total),
      jsonb_build_object('fields', jsonb_build_object('weights', 'Must total 100')));
  end if;
  update public.rubric_versions set published_at = now() where id = p_rubric_version_id;
  perform private.write_audit('rubric.published', 'rubric_version', p_rubric_version_id::text, null, '{}'::jsonb,
    private.acting_role('config.manage'));
  return jsonb_build_object('rubric_version_id', p_rubric_version_id, 'published', true);
end;
$$;

-- -----------------------------------------------------------------------------
-- ADM-01 / ADM-02: challenges and their forms
-- -----------------------------------------------------------------------------

-- Field errors for a form schema and document list; '{}' when valid.
create or replace function private.validate_form_schema(p_schema jsonb, p_docs jsonb)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_errors jsonb := '{}'::jsonb;
  v_field  jsonb;
  v_keys   text[] := array[]::text[];
  v_key    text;
  v_doc    jsonb;
  v_dkeys  text[] := array[]::text[];
begin
  if p_schema is null or jsonb_typeof(p_schema -> 'sections') <> 'array' or jsonb_array_length(p_schema -> 'sections') = 0 then
    return jsonb_build_object('form_schema', 'Add at least one section');
  end if;
  if exists (select 1 from jsonb_array_elements(p_schema -> 'sections') s
             where btrim(coalesce(s ->> 'title', '')) = '' or jsonb_typeof(s -> 'fields') <> 'array') then
    v_errors := v_errors || jsonb_build_object('form_schema', 'Every section needs a title and a list of fields');
    return v_errors;
  end if;
  for v_field in select * from private.form_fields(p_schema) loop
    v_key := v_field ->> 'key';
    if v_key is null or v_key !~ '^[a-z][a-z0-9_]{1,40}$' then
      v_errors := v_errors || jsonb_build_object('form_schema', 'Field keys use lowercase letters, numbers and underscores');
    elsif v_key = any (v_keys) then
      v_errors := v_errors || jsonb_build_object('field:' || v_key, 'This key is used twice');
    elsif btrim(coalesce(v_field ->> 'label', '')) = '' then
      v_errors := v_errors || jsonb_build_object('field:' || v_key, 'Give the field a label');
    elsif coalesce(v_field ->> 'type', '') not in ('text', 'textarea', 'select', 'email') then
      v_errors := v_errors || jsonb_build_object('field:' || v_key, 'Choose text, long text, choice or email');
    elsif v_field ->> 'type' = 'select' and (jsonb_typeof(v_field -> 'options') <> 'array'
                                             or jsonb_array_length(v_field -> 'options') = 0) then
      v_errors := v_errors || jsonb_build_object('field:' || v_key, 'A choice field needs options');
    elsif v_field ? 'max_length' and (jsonb_typeof(v_field -> 'max_length') <> 'number'
                                      or (v_field ->> 'max_length')::numeric not between 1 and 20000) then
      v_errors := v_errors || jsonb_build_object('field:' || v_key, 'Maximum length must be 1 to 20,000');
    end if;
    v_keys := v_keys || v_key;
  end loop;
  if not exists (select 1 from private.form_fields(p_schema) f
                 where f ->> 'key' = 'title' and coalesce((f ->> 'required')::boolean, false)) then
    v_errors := v_errors || jsonb_build_object('form_schema', 'Include a required field with the key "title"');
  end if;

  if p_docs is null or jsonb_typeof(p_docs) <> 'array' then
    return v_errors || jsonb_build_object('required_docs', 'Must be a list');
  end if;
  for v_doc in select * from jsonb_array_elements(p_docs) loop
    v_key := v_doc ->> 'key';
    if v_key is null or v_key !~ '^[a-z][a-z0-9_]{1,40}$' or v_key = any (v_dkeys) or btrim(coalesce(v_doc ->> 'label', '')) = '' then
      v_errors := v_errors || jsonb_build_object('required_docs', 'Every document needs a unique key and a label');
    end if;
    v_dkeys := v_dkeys || v_key;
  end loop;
  return v_errors;
end;
$$;

create or replace function private.validate_challenge_dates(p_opens timestamptz, p_closes timestamptz)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_opens is null or p_closes is null or p_opens >= p_closes then
    perform private.raise_error('VALIDATION', 'The closing date must be after the opening date.',
      jsonb_build_object('fields', jsonb_build_object('closes_at', 'Must be after the opening date')));
  end if;
end;
$$;

create or replace function public.create_challenge(
  p_slug text, p_title text, p_summary text, p_opens_at timestamptz, p_closes_at timestamptz, p_audience text default '')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  perform private.require_config();
  if p_slug is null or p_slug !~ '^[a-z0-9][a-z0-9-]{1,80}$' or exists (select 1 from public.challenges c where c.slug = p_slug) then
    perform private.raise_error('VALIDATION', 'Use a new address of lowercase letters, numbers and hyphens.',
      jsonb_build_object('fields', jsonb_build_object('slug', 'Invalid or already used')));
  end if;
  perform private.validate_challenge_dates(p_opens_at, p_closes_at);
  insert into public.challenges (slug, title, summary, status, opens_at, closes_at, audience)
  values (p_slug, private.require_text(p_title, 'title', 1, 200, 'Give a title (up to 200 characters).'),
          left(coalesce(p_summary, ''), 1000), 'draft', p_opens_at, p_closes_at, left(coalesce(p_audience, ''), 300))
  returning id into v_id;
  perform private.write_audit('challenge.created', 'challenge', v_id::text, null, jsonb_build_object('slug', p_slug),
    private.acting_role('config.manage'));
  return jsonb_build_object('challenge_id', v_id, 'status', 'draft');
end;
$$;

create or replace function public.update_challenge(
  p_challenge_id uuid, p_title text, p_summary text, p_opens_at timestamptz, p_closes_at timestamptz, p_audience text default '')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_config();
  perform private.validate_challenge_dates(p_opens_at, p_closes_at);
  update public.challenges
  set title = private.require_text(p_title, 'title', 1, 200, 'Give a title (up to 200 characters).'),
      summary = left(coalesce(p_summary, ''), 1000), opens_at = p_opens_at, closes_at = p_closes_at,
      audience = left(coalesce(p_audience, ''), 300)
  where id = p_challenge_id;
  if not found then
    perform private.raise_error('VALIDATION', 'Choose a challenge.');
  end if;
  perform private.write_audit('challenge.updated', 'challenge', p_challenge_id::text, null, '{}'::jsonb, private.acting_role('config.manage'));
  return jsonb_build_object('challenge_id', p_challenge_id);
end;
$$;

-- Creates or updates the unpublished form version. Published versions never change (ADM-02).
create or replace function public.save_challenge_version(
  p_challenge_id uuid, p_brief_md text, p_form_schema jsonb, p_required_docs jsonb,
  p_rubric_version_id uuid, p_template_files jsonb default '[]'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_latest public.challenge_versions%rowtype;
  v_errors jsonb;
  v_id     uuid;
  v_no     integer;
begin
  perform private.require_config();
  if not exists (select 1 from public.challenges c where c.id = p_challenge_id) then
    perform private.raise_error('VALIDATION', 'Choose a challenge.');
  end if;
  if not exists (select 1 from public.rubric_versions r where r.id = p_rubric_version_id) then
    perform private.raise_error('VALIDATION', 'Choose a rubric version.', jsonb_build_object('fields', jsonb_build_object('rubric_version_id', 'Unknown')));
  end if;
  if char_length(coalesce(p_brief_md, '')) > 20000 then
    perform private.raise_error('VALIDATION', 'The brief is too long.', jsonb_build_object('fields', jsonb_build_object('brief_md', 'Up to 20,000 characters')));
  end if;
  v_errors := private.validate_form_schema(p_form_schema, coalesce(p_required_docs, '[]'::jsonb));
  if jsonb_typeof(coalesce(p_template_files, '[]'::jsonb)) <> 'array' then
    v_errors := v_errors || jsonb_build_object('template_files', 'Must be a list');
  end if;
  if v_errors <> '{}'::jsonb then
    perform private.raise_error('VALIDATION', 'The form needs attention.', jsonb_build_object('fields', v_errors));
  end if;

  select * into v_latest from public.challenge_versions v where v.challenge_id = p_challenge_id
  order by v.version_no desc limit 1 for update;
  if v_latest.id is not null and v_latest.published_at is null then
    update public.challenge_versions
    set brief_md = coalesce(p_brief_md, ''), form_schema = p_form_schema, required_docs = coalesce(p_required_docs, '[]'::jsonb),
        template_files = coalesce(p_template_files, '[]'::jsonb), rubric_version_id = p_rubric_version_id
    where id = v_latest.id;
    v_id := v_latest.id; v_no := v_latest.version_no;
  else
    v_no := coalesce(v_latest.version_no, 0) + 1;
    insert into public.challenge_versions (challenge_id, version_no, brief_md, form_schema, required_docs, template_files, rubric_version_id)
    values (p_challenge_id, v_no, coalesce(p_brief_md, ''), p_form_schema, coalesce(p_required_docs, '[]'::jsonb),
            coalesce(p_template_files, '[]'::jsonb), p_rubric_version_id)
    returning id into v_id;
  end if;
  perform private.write_audit('challenge.version_saved', 'challenge_version', v_id::text, null,
    jsonb_build_object('challenge_id', p_challenge_id, 'version_no', v_no), private.acting_role('config.manage'));
  return jsonb_build_object('challenge_version_id', v_id, 'version_no', v_no, 'published', false);
end;
$$;

-- Publishes the draft form version (if any) and opens the challenge.
create or replace function public.publish_challenge(p_challenge_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_c      public.challenges%rowtype;
  v_draft  public.challenge_versions%rowtype;
  v_no     integer;
begin
  perform private.require_config();
  select * into v_c from public.challenges c where c.id = p_challenge_id for update;
  if v_c.id is null then
    perform private.raise_error('VALIDATION', 'Choose a challenge.');
  end if;
  select * into v_draft from public.challenge_versions v
  where v.challenge_id = v_c.id and v.published_at is null order by v.version_no desc limit 1;
  if v_draft.id is not null then
    if not exists (select 1 from public.rubric_versions r where r.id = v_draft.rubric_version_id and r.published_at is not null) then
      perform private.raise_error('VALIDATION', 'Publish the rubric before the challenge.',
        jsonb_build_object('fields', jsonb_build_object('rubric_version_id', 'Rubric not published')));
    end if;
    update public.challenge_versions set published_at = now() where id = v_draft.id;
  elsif not exists (select 1 from public.challenge_versions v where v.challenge_id = v_c.id and v.published_at is not null) then
    perform private.raise_error('VALIDATION', 'Add the application form before publishing.');
  end if;
  update public.challenges set status = 'published' where id = v_c.id;
  select max(v.version_no) into v_no from public.challenge_versions v where v.challenge_id = v_c.id and v.published_at is not null;
  perform private.write_audit('challenge.published', 'challenge', v_c.id::text, null,
    jsonb_build_object('form_version', v_no), private.acting_role('config.manage'));
  return jsonb_build_object('challenge_id', v_c.id, 'status', 'published', 'form_version', v_no);
end;
$$;

create or replace function public.set_challenge_status(p_challenge_id uuid, p_status text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_config();
  if p_status is null or p_status not in ('unpublished', 'closed') then
    perform private.raise_error('VALIDATION', 'Choose unpublished or closed (use publish to open a challenge).');
  end if;
  update public.challenges set status = p_status where id = p_challenge_id and status <> 'draft';
  if not found then
    perform private.raise_error('INVALID_STATE', 'Only a published challenge can be unpublished or closed.');
  end if;
  perform private.write_audit('challenge.status_changed', 'challenge', p_challenge_id::text, null,
    jsonb_build_object('status', p_status), private.acting_role('config.manage'));
  return jsonb_build_object('challenge_id', p_challenge_id, 'status', p_status);
end;
$$;

-- ADM-02: only a never-published challenge without any ideas can be deleted.
create or replace function public.delete_challenge(p_challenge_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_config();
  if not exists (select 1 from public.challenges c where c.id = p_challenge_id and c.status = 'draft')
     or exists (select 1 from public.challenge_versions v where v.challenge_id = p_challenge_id and v.published_at is not null)
     or exists (select 1 from public.proposals p join public.challenge_versions v on v.id = p.challenge_version_id
                where v.challenge_id = p_challenge_id) then
    perform private.raise_error('INVALID_STATE', 'Only an unused draft challenge can be deleted. Unpublish or close it instead.');
  end if;
  delete from public.challenge_versions where challenge_id = p_challenge_id;
  delete from public.challenges where id = p_challenge_id;
  perform private.write_audit('challenge.deleted', 'challenge', p_challenge_id::text, null, '{}'::jsonb, private.acting_role('config.manage'));
  return jsonb_build_object('challenge_id', p_challenge_id, 'deleted', true);
end;
$$;

-- -----------------------------------------------------------------------------
-- Grants
-- -----------------------------------------------------------------------------

revoke all on function
  public.save_content_page(text, text, text, text, text, integer, boolean, text),
  public.set_service_hours(integer, boolean, time, time),
  public.set_service_closure(date, text),
  public.set_chat_override(text),
  public.create_role(text, text, text[], boolean),
  public.set_role_permissions(text, text[]),
  public.create_rubric(text, text),
  public.create_rubric_draft(uuid),
  public.save_rubric_criterion(uuid, text, text, numeric, jsonb, text, integer),
  public.remove_rubric_criterion(uuid, text),
  public.publish_rubric_version(uuid),
  public.create_challenge(text, text, text, timestamptz, timestamptz, text),
  public.update_challenge(uuid, text, text, timestamptz, timestamptz, text),
  public.save_challenge_version(uuid, text, jsonb, jsonb, uuid, jsonb),
  public.publish_challenge(uuid),
  public.set_challenge_status(uuid, text),
  public.delete_challenge(uuid)
from public, anon;

grant execute on function
  public.save_content_page(text, text, text, text, text, integer, boolean, text),
  public.set_service_hours(integer, boolean, time, time),
  public.set_service_closure(date, text),
  public.set_chat_override(text),
  public.create_role(text, text, text[], boolean),
  public.set_role_permissions(text, text[]),
  public.create_rubric(text, text),
  public.create_rubric_draft(uuid),
  public.save_rubric_criterion(uuid, text, text, numeric, jsonb, text, integer),
  public.remove_rubric_criterion(uuid, text),
  public.publish_rubric_version(uuid),
  public.create_challenge(text, text, text, timestamptz, timestamptz, text),
  public.update_challenge(uuid, text, text, timestamptz, timestamptz, text),
  public.save_challenge_version(uuid, text, jsonb, jsonb, uuid, jsonb),
  public.publish_challenge(uuid),
  public.set_challenge_status(uuid, text),
  public.delete_challenge(uuid)
to authenticated;

revoke all on function
  private.require_config(), private.check_permissions(text[]), private.rubric_draft(uuid),
  private.validate_form_schema(jsonb, jsonb), private.validate_challenge_dates(timestamptz, timestamptz)
from public;
