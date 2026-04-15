# YBC User Stories

## Observer

- As an observer, I can understand what YBC is and what influence it currently holds.
- As an observer, I can browse the member roster and see which members are still ramping into full weight.
- As an observer, I can inspect proposals and immediately understand what phase they are in.

## Member

- As a member, I can see my raw staked amount and my effective voting weight separately.
- As a member, I can propose an addition or expulsion in the allowed scope.
- As a member, I can retract my proposal when retraction is allowed.
- As a member, I can vote yea or nay and see whether the proposal is currently passing.
- As a member, I can tell when a passed proposal becomes executable.
- As a member, I can see my YBC-related rewards and go to the shared claim surface.

## Operator / management

- As an operator, I can add or remove members through the scoped operator UI.
- As an operator, I can inspect current thresholds and hook configuration.
- As management, I can inspect operator permissions and governance wiring.

## UX invariants

- The UI must not collapse raw stake and effective weight into one number.
- The UI must not imply that expired proposals can be revived.
- The UI must not imply that YBC rewards are claimed on a separate isolated page in MVP.
- The UI must not expose a generic arbitrary-call UI in MVP.
