# Changelog

The release number is the `version` in `package.json`. It is shown in the portal's footer, and each release is tagged in git as `vMAJOR.MINOR.PATCH` on the commit that is deployed. Raise the patch for fixes, the minor for new features, the major for breaking changes.

## 1.1.0

The release number stays 1.1.0 until the GitLab pipeline is set up.


- The face check no longer tries to send MediaPipe usage logs to Google: the address is removed at build time and a build that still contains it is refused (as in the customer portal).
- react-grid-layout 1.5.4 (1.5.2 shipped a stray binary and C source file in its npm package).

## 1.0.1

- Bulk payouts and the profile photo stop a file over 10 MB before it is sent (the API's own limit).

## 1.0.0

First release.

- Sign in with a PIN or password, activate access, forgot PIN / password.
- Send money, mobile money, bank transfer, airtime, CREDELEC, bills, the merchant's own payment code, cash in / out as an agent and bulk payouts.
- Customer sign-up by agents, with a camera photo check (checked on the device).
- Stores, terminals, history, notifications, support cases, profile and security settings.
- English, Portuguese and Arabic. Per-bank branding from the environment.
- Security review before release: Content-Security-Policy, framing blocked, nosniff, Referrer-Policy, Permissions-Policy and HSTS; the face check's runtime served by the portal itself; dependencies updated with no known vulnerabilities (React Router 7.18.6).
