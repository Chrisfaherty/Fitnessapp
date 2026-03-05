# Row Level Security Policies

All tables have RLS enabled. No unauthenticated access is possible.

## Helper Functions

```sql
-- Checks if current user is admin
CREATE FUNCTION is_admin() RETURNS bool AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Checks if current user is an active trainer for a given client
CREATE FUNCTION is_linked_trainer(p_client_id uuid) RETURNS bool AS $$
  SELECT EXISTS (
    SELECT 1 FROM trainer_clients
    WHERE trainer_id = auth.uid()
      AND client_id = p_client_id
      AND active = true
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

## Policy Matrix

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| profiles | own row OR trainer linked OR admin | own row | own row | admin |
| trainer_clients | own trainer OR own client OR admin | admin | admin | admin |
| health_daily | own row OR linked trainer OR admin | own row | own row | own row |
| health_workouts | own row OR linked trainer OR admin | own row | own row | own row |
| diary_entries | own row OR linked trainer OR admin | own row | own row | own row |
| check_ins | own row OR linked trainer OR admin | own row | own row OR trainer | own row |
| meal_plans | own client row OR own trainer row OR admin | trainer | trainer | trainer |
| meal_plan_days | via meal_plan | trainer | trainer | trainer |
| conversations | participant (trainer_id OR client_id) | trainer | — | — |
| messages | participant | participant | — | — |
| weekly_summaries | own row OR linked trainer OR admin | service role | service role | — |
| exercises | any authenticated | admin | admin | admin |
| workout_templates | own trainer OR admin | trainer | own trainer | own trainer |
| workout_template_exercises | via template | trainer | trainer | trainer |
| workout_assignments | own client OR own trainer OR admin | trainer | trainer | trainer |
| workout_sessions | own client OR linked trainer OR admin | own client | own client | — |
| workout_session_sets | via session | own client | own client | — |

## Notable Patterns

### Trainer-Client Isolation
The `is_linked_trainer()` function ensures trainers can only access data for clients explicitly linked in `trainer_clients`. An unlinked trainer cannot read any client data even if they know the UUID.

### Conversation Membership
Messages use path-based checking: both `trainer_id` and `client_id` columns on `conversations` are checked to grant access. Neither party can access the other's private messages.

### Service Role for Aggregations
The `weeklySummary` edge function runs with the service role key, bypassing RLS to read all clients' data for aggregation. The resulting `weekly_summaries` rows are then accessible through normal RLS rules.

### Storage RLS
`message-videos` bucket policies check that the storage path starts with the conversation ID, and that the requester is a participant in that conversation. The `signedMediaUrl` edge function enforces this before generating URLs.

## Testing
See `tests/db/rls_test.sql` for 40 pgTAP assertions covering all isolation requirements.
