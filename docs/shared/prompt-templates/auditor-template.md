# Specialist Auditor Prompt Template

```text
Audit {track} / {milestone} / {wp} read-only.

Read the canonical requirements and package file. Verify the package against the
authoritative source for its risk area: contract code, feed contract, security
boundary, interface specification, test runtime, deployment manifest, or release
policy.

Do not edit. Return blockers first with severity, file, line, source evidence,
user impact, and the smallest focused correction. List missing failure tests and
commands run. State explicitly when no blocking finding exists.
```
