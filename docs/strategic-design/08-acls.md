# Anti-Corruption Layers (ACLs)

> **How to fill:** Document where ACLs exist or are planned. ACLs translate external models into your domain model and protect your context from external changes.
>
> **Checklist item #5:** Design anti-corruption layers for external systems.

---

## Identity → EI Runtime

| Aspect | Current | Target (launch) |
|--------|---------|-----------------|
| Auth | PILOT_SECRET (Bearer token) | Neon Auth SDK (Google OAuth) |
| Student identity | Client-provided studentId | Server-derived from auth session (auth_user_id → student_id mapping) |
| ACL needed? | No (pilot) | Yes: translate Neon Auth session to EI StudentId; never trust client body |

---

## Institute / external dashboard

| Aspect | Current | Target |
|--------|---------|--------|
| Data exposed | Radar alerts only (getRadarAlerts) | Same; never raw events |
| ACL needed? | Implicit: Radar tools are the boundary | Explicit Published Language: versioned RadarAlert schema; institute consumes only that |

---

## Future external systems

| System | Relationship | ACL approach |
|--------|--------------|--------------|
| Notification service | Downstream consumer | EI publishes integration events (e.g. ReminderDue); consumer adapts to its model |
| Analytics / data warehouse | Downstream consumer | Same: integration events only; no raw EI payloads |
