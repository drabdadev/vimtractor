# Automated image release

The workflow builds the frozen dependency graph on the build runner, labels the
image with its full source revision, and transfers that exact image as a
short-lived artifact. The optional force-rebuild switch disables the runner's
build cache. Build jobs receive no production release credentials.

The separate release job pins server identity and uses a dedicated, app-only
account. Its forced command validates one image namespace, revision, hash and
resource budget before invoking a protected release handler. The connection
cannot open an administrative shell, upload runtime configuration or issue raw
Docker commands. `scripts/send-release-image.py` implements this fixed protocol.

The handler preserves existing runtime configuration and the leaderboard volume,
checks a complete leaderboard snapshot, retains the exact running image for
rollback, and requires health plus routed compiled-asset verification. A failed
release is not accepted merely because its rollback succeeds. Private deployment
paths and operational evidence remain in the infrastructure contract.
