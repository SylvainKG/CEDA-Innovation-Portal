-- 015: set_alert_preference() so a signed-in person can turn their own e-mail alerts on or off
-- (NTF-02; asked for in PR #82).
--
-- profiles.alerts_opt_in already decides whether private.notify queues an e-mail (migration 001),
-- but nobody could change it: browsers have no UPDATE on profiles (D-02) and there was no function.
-- This changes only the caller's own row (no user id parameter), and is audited like record_consent.
-- Turning alerts on affects future notifications only; nothing already notified is re-sent.

create or replace function public.set_alert_preference(p_opt_in boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    perform private.raise_error('FORBIDDEN', 'Sign in first.');
  end if;
  if p_opt_in is null then
    perform private.raise_error('VALIDATION', 'Choose whether to receive e-mail alerts.',
      jsonb_build_object('fields', jsonb_build_object('alerts_opt_in', 'Choose on or off')));
  end if;

  update public.profiles set alerts_opt_in = p_opt_in where id = auth.uid();
  if not found then
    perform private.raise_error('FORBIDDEN', 'Sign in first.');
  end if;
  perform private.write_audit('account.alerts_changed', 'profile', auth.uid()::text, null,
    jsonb_build_object('alerts_opt_in', p_opt_in));
  return jsonb_build_object('alerts_opt_in', p_opt_in);
end;
$$;

revoke all on function public.set_alert_preference(boolean) from public;
grant execute on function public.set_alert_preference(boolean) to authenticated;
