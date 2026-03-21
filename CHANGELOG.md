# Changelog

## [Unreleased]
### Security
- HttpOnly cookies with 24h session TTL
- Rate limiting on all API routes (configurable via env vars)
- Message length cap and history sanitization
- IDOR-1 fix: force session identity in /api/users/sync
- Restrict OPEN_BETA with domain whitelist (OPEN_BETA_DOMAINS)
- Replace NODE_ENV auth bypass with explicit DISABLE_AUTH flag
- Remove API key from WebSocket payload

### Added
- SECURITY.md with deployment checklist
- Admin role system (requireAdmin + ADMIN_EMAILS)
- Parametrized metadata domain via NEXTAUTH_URL
