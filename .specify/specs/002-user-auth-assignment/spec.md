# Feature Specification: User Authentication and Multi-Account Assignment

**Feature Branch**: `002-user-auth-assignment`

**Created**: 2026-10-18

**Status**: Draft

**Input**: User description: "User authentication and multi-account assignment"

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - User Authentication & Session Lifecycle (Priority: P1)

An operator or administrator visits the inFlow platform, is prompted to authenticate with their username and password, receives a secure session upon successful verification, and gains access to the application dashboard. When their session expires or when they click logout, their session is securely terminated and protected areas become inaccessible.

**Why this priority**:
Authentication is the foundational prerequisite for all multi-tenancy and data isolation. Without identity verification, the control plane cannot protect Instagram accounts or distinguish between different clients.

**Independent Test**:
Can be fully tested by attempting to access protected dashboard routes unauthenticated (verifying redirection to login), entering valid credentials to access the dashboard, and clicking logout to verify session termination and redirection back to login.

**Acceptance Scenarios**:
1. **Given** an unauthenticated visitor accessing any dashboard URL, **When** the page loads, **Then** the user is redirected to the login interface.
2. **Given** valid user credentials, **When** the user submits the login form, **Then** a session is established and the user is redirected to their assigned account dashboard.
3. **Given** invalid or blank credentials, **When** submission is attempted, **Then** an informative error message is displayed in the active interface language without exposing security details.
4. **Given** an authenticated user, **When** they click the logout action, **Then** their active session is invalidated and they are returned to the login view.

---

### User Story 2 - Multi-Account Tenancy & Scoped Dashboard (Priority: P1)

A tenant user with multiple assigned Instagram pages logs in and can view, monitor, and configure only the Instagram accounts explicitly assigned to their user profile. The account selector in the top navigation displays only their authorized accounts. Any attempt to query or configure an unassigned account is blocked.

**Why this priority**:
Tenancy isolation ensures client privacy, preventing different Instagram account owners from viewing each other's posts, comment logs, customer interactions, or automation configurations.

**Independent Test**:
Can be fully tested by creating Tenant A assigned to `@r9spoort1` and Tenant B assigned to `@inflow.shop`. When Tenant A logs in, only `@r9spoort1` appears in their account selector. Direct navigation or requests targeted at `@inflow.shop` result in an access-denied barrier.

**Acceptance Scenarios**:
1. **Given** Tenant A with access to `@r9spoort1`, **When** viewing the account dropdown, **Then** only `@r9spoort1` is listed as selectable.
2. **Given** Tenant A, **When** they attempt to directly access or modify data belonging to `@inflow.shop`, **Then** the system denies the request and presents a forbidden/unauthorized notice.
3. **Given** a tenant user assigned multiple accounts, **When** they choose a different account from the switcher, **Then** the dashboard smoothly transitions to the selected account's posts, stats, and logs.
4. **Given** a tenant user with zero assigned accounts, **When** they log in, **Then** an empty-state screen appears informing them that no Instagram accounts are currently linked to their profile.

---

### User Story 3 - Superadmin Back-Office & Account Assignment (Priority: P2)

A Superadmin logs into the platform and accesses a dedicated Back-Office administrative portal. In this portal, the Superadmin can view the roster of all platform users, create new tenant accounts with credentials, update account details, activate or suspend users, and assign or revoke Instagram accounts for each tenant.

**Why this priority**:
Self-contained user and account management empowers platform owners to onboard clients, provision accounts, and reallocate Instagram pages without manual database intervention.

**Independent Test**:
Can be fully tested by logging in as a Superadmin, navigating to the Back-Office, creating a new tenant user, assigning an Instagram page to them, and verifying that the assignment is immediately reflected when the tenant logs in.

**Acceptance Scenarios**:
1. **Given** a logged-in Superadmin, **When** navigating to the Back-Office, **Then** the system displays the user management directory and account assignment controls.
2. **Given** a standard tenant user, **When** they attempt to navigate to Back-Office administrative routes, **Then** access is denied with a 403 Forbidden notification.
3. **Given** a Superadmin creating a new user, **When** submitting the username, display name, and password, **Then** the user account is created and immediately available for account assignment.
4. **Given** an existing tenant user, **When** a Superadmin assigns an unassigned Instagram page to that user, **Then** the ownership link is persisted and the tenant gains access to that page.
5. **Given** a suspended user, **When** they attempt to log in with valid credentials, **Then** authentication is rejected with an account suspension notification.

---

### User Story 4 - Multi-Language & RTL Authentication Experience (Priority: P3)

Users and administrators interact with the login interface, tenant switcher, and Back-Office views in their preferred language (Persian, Arabic, or English) with proper right-to-left layout, Vazirmatn typography, and clear localized validation feedback.

**Why this priority**:
inFlow's target market is predominantly Persian- and Arabic-speaking. Flawless bidirectional presentation is essential for trust and usability.

**Independent Test**:
Can be fully tested by switching the language selector between Persian, Arabic, and English on the login screen and Back-Office views, verifying that labels, buttons, error messages, and form alignment dynamically adjust according to language direction.

**Acceptance Scenarios**:
1. **Given** language is set to Persian or Arabic, **When** the login or Back-Office screen is rendered, **Then** text aligns to the right (`dir="rtl"`), Vazirmatn font is applied, and form validation messages appear in the selected language.
2. **Given** language is set to English, **When** views are rendered, **Then** the layout aligns to the left (`dir="ltr"`) with standard typography.

---

### Edge Cases

- **Session Expiry During In-Flight Form Edits**: If a user's session expires while they are configuring a post's automation rules, submitting the form must present a clear session expiration prompt rather than silent failure or uncaught error.
- **Account Reassignment While Active**: If a Superadmin revokes an Instagram account from a tenant while that tenant is actively viewing it, the next action by the tenant must cleanly redirect to another assigned account or to the empty-state screen with an explanatory message.
- **Username Case Sensitivity**: User authentication must handle usernames case-insensitively (e.g. `Admin` and `admin` represent the same identity) to prevent duplicate accounts and login confusion.
- **Superadmin Lockout Prevention**: The system must prevent the deletion or deactivation of the last remaining active Superadmin account.
- **Concurrent User Sessions**: A user logging in from a new device or browser window should either be permitted or gracefully handled without corrupting existing session state.
- **Blank or Malformed Passwords**: Password submission must enforce minimal validity criteria (non-empty, minimum length) with localized feedback before submission.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a credential-based authentication interface (username and password) accessible to all platform operators.
- **FR-002**: System MUST securely hash and verify user passwords using industry-standard cryptographic hashing functions.
- **FR-003**: System MUST manage authenticated user sessions and automatically guard all Control Plane dashboard routes, redirecting unauthenticated visitors to the login page.
- **FR-004**: System MUST provide a logout capability on all authenticated views that terminates the active user session.
- **FR-005**: System MUST enforce Role-Based Access Control (RBAC) with at least two distinct roles:
  - `superadmin`: Access to the Back-Office administration portal, user management, and global account assignment.
  - `tenant`: Access restricted strictly to managing their assigned Instagram accounts.
- **FR-006**: System MUST isolate tenant access: a tenant user MUST only be able to view, switch between, and configure Instagram accounts explicitly assigned to their user profile.
- **FR-007**: System MUST enforce server-side tenancy authorization on all account-specific data queries and mutations, rejecting unauthorized requests with a forbidden outcome.
- **FR-008**: System MUST provide a dedicated Back-Office interface accessible exclusively to users with the `superadmin` role.
- **FR-009**: Back-Office MUST enable Superadmins to list, create, update, suspend, activate, and delete user accounts.
- **FR-010**: Back-Office MUST enable Superadmins to assign one or more Instagram accounts to a user (1-to-N user-to-accounts relationship) and revoke assignments.
- **FR-011**: System MUST display an empty-state screen for tenant users who have no assigned Instagram accounts, with helpful instructions to contact their platform administrator.
- **FR-012**: System MUST automatically seed or provision a default Superadmin profile on initial database setup to ensure administrators can access the system out-of-the-box.
- **FR-013**: System MUST provide localized user interface text for login, account switching, Back-Office management, and error states in Persian, Arabic, and English with strict RTL layout compliance for Persian and Arabic.

---

### Key Entities

- **User**:
  - Represents an authorized human operator or administrator of the platform.
  - Attributes: Unique identifier, username (unique, case-insensitive), display name, password hash, role (`superadmin` or `tenant`), status (`active` or `suspended`), last login timestamp, creation timestamp, update timestamp.
- **UserAccountAssignment**:
  - Represents the association between a tenant user and an Instagram account.
  - Attributes: Unique assignment identifier, user identifier reference, Instagram account username reference, assigned timestamp.
  - Enforces the 1-to-N tenant ownership model where a user can manage multiple Instagram pages.
- **UserSession**:
  - Represents an active authentication session.
  - Attributes: Unique session token or token payload, user identifier reference, expiration timestamp, created timestamp.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Unauthenticated visitors navigating to any protected route are redirected to the login screen in under 500 milliseconds.
- **SC-002**: 100% of unauthorized attempts by a tenant to query or modify data belonging to an unassigned Instagram account are rejected with an access-denied outcome.
- **SC-003**: Superadmins can create a new tenant user and assign an Instagram account in under 45 seconds through the Back-Office interface.
- **SC-004**: Multi-account tenants can switch between assigned accounts with instant context update and zero data leakage between accounts.
- **SC-005**: 100% of authentication, session management, and administrative views comply with bidirectional (RTL/LTR) formatting and display appropriate translations across Persian, Arabic, and English.
- **SC-006**: Default Superadmin setup ensures immediate, successful first-boot access without requiring manual shell or database intervention.

---

## Assumptions

- **Administrative Provisioning**: Public user self-registration is intentionally disabled; all tenant accounts are provisioned and managed by Superadmins in the Back-Office plane.
- **Standard Web Session Management**: Sessions are managed via secure, HTTP-only web cookies with appropriate expiration and renewal policies.
- **1-to-N Account Model**: In accordance with Constitution Principle VI, each Instagram account is assigned to an authorized tenant user profile, and a tenant user can manage one or more accounts.
- **Separation from Worker Bot Credentials**: Execution Plane worker bots (`Hermes Agent`) authenticate via scoped inter-plane API tokens (Constitution Principle VIII), not via human user login sessions.
- **First-Boot Superadmin**: If no users exist in the database upon startup, a default superadmin profile is automatically provisioned with configurable or documented initial credentials.
