# Security Policy

## Reporting a vulnerability

Please do **not** open a public issue for security vulnerabilities.

Use GitHub's private vulnerability reporting instead: go to the
repository's **Security** tab and choose **Report a vulnerability**.
That opens a private advisory visible only to you and the maintainers.

Please include:

- A description of the issue and its impact.
- Steps to reproduce, ideally with a minimal example.
- The version or commit you tested.

DarkHangar runs locally and processes flight-log files the user
supplies; reports about malicious `.BIN` files, the upload endpoint,
or the local API are all in scope.

## Supported versions

Only the latest `main` branch is supported with fixes.
