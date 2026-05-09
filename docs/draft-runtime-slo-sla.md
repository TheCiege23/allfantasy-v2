# Draft Runtime SLO and SLA

This document defines reliability objectives and service expectations for draft runtime operations.

## Scope

Includes:

- pick commits
- autopick execution
- realtime propagation
- notification delivery
- reconciliation and recovery

Excludes:

- non-runtime content generation latency
- third-party provider outages outside draft mutation path

---

## SLO Definitions

### 1. Pick Confirmation Latency

- SLI: Time from validated pick request accepted to committed response returned
- Target SLO: p95 <= 800 ms, p99 <= 1500 ms
- Error budget window: 30 days

### 2. Websocket or Realtime Propagation Latency

- SLI: Time from committed draft event to client receipt of event
- Target SLO: p95 <= 500 ms, p99 <= 1200 ms
- Fallback: Polling refresh within 2 to 8 seconds based on mode

### 3. Draft Runtime Availability

- SLI: Percentage of successful runtime mutation requests for healthy sessions
- Target SLO: 99.95 percent monthly

### 4. Autopick Reliability

- SLI: Percentage of eligible timer expiries producing exactly one valid autopick outcome
- Target SLO: 99.9 percent monthly

### 5. Notification Delivery

- SLI: Time from event creation to user-notification materialization
- Target SLO: p95 <= 2 s, p99 <= 5 s

### 6. Reconciliation Recovery Time

- SLI: Time to reconcile corrupted session after incident declaration
- Target SLO: 95 percent within 10 minutes

---

## SLA Commitments

### Internal Beta SLA

- Severity 1 response time: <= 5 minutes
- Severity 2 response time: <= 30 minutes
- Severity 3 response time: <= 1 business day

### Paid League SLA (Future)

- Draft runtime availability: 99.9 percent monthly
- Severity 1 mitigation start: <= 10 minutes
- Public incident updates: every 30 minutes until stabilized

---

## Monitoring and Reporting

Required dashboards:

- pick latency percentiles
- realtime propagation latency
- autopick success and conflict rates
- lock wait and timeout metrics
- notification queue latency
- reconciliation job duration

Required weekly report:

- SLO attainment by metric
- Error budget burn rates
- Top incidents and corrective actions

---

## Breach Policy

If any critical SLO is breached:

1. Freeze non-critical feature rollouts in draft runtime.
2. Open incident and corrective action owner assignment.
3. Prioritize reliability fixes over new features.
4. Validate recovery with targeted load and race suites.

---

## Review Cadence

- Weekly during active beta
- Bi-weekly after stabilization
- Immediate review after any Severity 1 incident