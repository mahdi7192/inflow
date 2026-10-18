# Tasks: Autonomous Instagram Automation Worker Engine & Follow Verification Lifecycle

**Branch**: `009-instagram-automation-engine` | **Spec**: [.specify/specs/009-instagram-automation-engine/spec.md] | **Plan**: [.specify/specs/009-instagram-automation-engine/plan.md]

## Task Checklist

### Phase 1: Core Automation Engine Modules
- [x] **T-001**: Implement `matcher.py` with Persian normalization, keyword matching, and follow confirmation detection (`/opt/inflow/engine/matcher.py`).
- [x] **T-002**: Implement `humanizer.py` with adaptive jitter delay calculations and natural Persian follow request templates (`/opt/inflow/engine/humanizer.py`).
- [x] **T-003**: Implement `ig_client.py` for cookie extraction, friendship checking, comment scraping, and direct messaging via SOCKS5 proxy (`/opt/inflow/engine/ig_client.py`).
- [x] **T-004**: Implement `db.py` with SQLite WAL mode, schema initialization (`inflow_pending_follows`), and idempotency lookups (`/opt/inflow/engine/db.py`).

### Phase 2: Autonomous Worker & Lifecycle Logic
- [x] **T-005**: Implement `worker.py` orchestrating comment queue scanning and rule matching.
- [x] **T-006**: Implement follow-gate state machine in `worker.py`: verify follower status, queue pending follow on negative result, send public request, and defer DM.
- [x] **T-007**: Implement follow confirmation resolver in `worker.py`: transition `pending_follow` to `resolved` on confirmation comment and dispatch deferred DM.
- [x] **T-008**: Build executable runner script `run_worker.sh` wrapping the Hermes Python environment.

### Phase 3: Linux Systemd Daemonization & Verification
- [x] **T-009**: Create systemd template unit `/etc/systemd/system/inflow-worker@.service` with auto-restart and isolated logging.
- [x] **T-010**: Deploy and activate `inflow-worker@mahdiketabdar` service and verify active state.
- [x] **T-011**: Verify database schemas, foreign keys, and idempotency guarantees under live test conditions.
