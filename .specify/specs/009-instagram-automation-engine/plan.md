# Implementation Plan: Autonomous Instagram Automation Worker Engine & Follow Verification Lifecycle

**Branch**: `009-instagram-automation-engine` | **Date**: 2026-10-18 | **Spec**: [.specify/specs/009-instagram-automation-engine/spec.md]

## Summary

This feature delivers the complete background execution engine for inFlow Instagram automation:
1. **Autonomous Comment Queue Processing**: High-throughput, periodic polling and trigger evaluation across all active posts (`auto_reply = 1`).
2. **Follow-Gate Lifecycle (`dm_require_follow`)**: Strict enforcement where non-followers receive a natural public comment asking them to follow and confirm with "فالو کردم", while recording state in `inflow_pending_follows` and withholding DMs until confirmed.
3. **Persian/Arabic Text Normalization & Confirmation Matching**: Resilient keyword and regex matching for diverse Persian follow confirmation expressions.
4. **Humanized Anti-Ban Protection**: Adaptive queue pacing, jittered delays, and randomized response phrasing.
5. **Multi-Account Linux Systemd Isolation**: Service templates (`inflow-worker@<username>.service`) providing autonomous 24/7 background execution with self-healing and process isolation.

## Technical Context

- **Language / Runtime**: Python 3.14 (Hermes runtime / `/root/.hermes/tools/python-3.14.7...`)
- **HTTP / TLS Client**: `curl_cffi` impersonating modern Chrome browser TLS fingerprints, routed through local SOCKS5 proxy (`127.0.0.1:40000`).
- **Database**: SQLite WAL mode (`/opt/inflow/data/inflow.db`)
- **Key Modules in `/opt/inflow/engine/`**:
  - `ig_client.py`: Instagram Web API / GraphQL client, cookie extractor from profile directory, friendship status checker, comment fetcher, and messaging handler.
  - `matcher.py`: Unicode normalization, keyword filtering, and follow confirmation regex parsing.
  - `humanizer.py`: Adaptive jitter delay calculator and humanized template generator.
  - `db.py`: SQLite query layer for rules, pending follow state transitions, and interaction idempotency.
  - `worker.py`: Autonomous execution loop coordinating poll passes, state transitions, and actions.
  - `inflow-worker@.service`: Systemd service unit template for individual account daemons.

## Constitution Check

- **Principle I (Spec-Driven Development)**: Comprehensive spec, plan, and tasks created before finalization.
- **Principle III (Idempotency & Anti-Shadowban Protection)**: Guarantees every action is locked by `comment_id` in `comment_interactions` and delays are humanized.
- **Principle VI (Multi-Tenant & Account Isolation)**: Each account worker operates within its own systemd instance, reading only its own isolated profile session.

## Phase Plan

### Phase 1: Engine Architecture & Core Modules
- Build `ig_client.py` with proxy support, cookie extraction from Chrome profiles, and friendships show API.
- Build `matcher.py` with Persian normalization and follow confirmation detection.
- Build `humanizer.py` with jitter pacing and diversified Persian reply messages.
- Build `db.py` supporting `inflow_pending_follows` table and atomic state transactions.

### Phase 2: Autonomous Worker Coordination & Follow-Gate State Machine
- Implement `worker.py` with `--account`, `--once`, and `--loop-interval` arguments.
- Connect comment processing loop: fetch comments -> filter processed -> match rule -> verify follow -> dispatch reply/DM or register pending follow.
- Implement pending follow resolution upon subsequent confirmation comments.

### Phase 3: Systemd Daemonization & Multi-Account Deployment
- Create `/etc/systemd/system/inflow-worker@.service` template.
- Enable and start `inflow-worker@mahdiketabdar`.
- Validate service logs, process lifecycle, and zero resource leaks.
