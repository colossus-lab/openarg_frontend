# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in OpenArg, please report it responsibly:

1. **Do NOT open a public GitHub issue**
2. Email: security@colossuslab.org
3. Include: description, steps to reproduce, potential impact

We will acknowledge receipt within 48 hours and provide a timeline for a fix.

## Deployment Security Checklist

Before deploying OpenArg to production, ensure:

- [ ] All secrets in `.env` are generated fresh (never use defaults)
- [ ] `NEXTAUTH_SECRET` is generated with `openssl rand -base64 32`
- [ ] `OPENARG_BACKEND_API_KEY` matches the backend's `BACKEND_API_KEY`
- [ ] Google OAuth credentials are configured for your domain
- [ ] `NEXTAUTH_URL` matches your production URL
- [ ] `ALLOWED_EMAILS` is set (or `OPEN_BETA=true` with `OPEN_BETA_DOMAINS`)
- [ ] `DISABLE_AUTH` is NOT set in production
- [ ] HTTPS is enabled via reverse proxy

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXTAUTH_SECRET` | Yes | JWT signing secret (generate with `openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Yes | Public URL of the frontend |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth client secret |
| `OPENARG_BACKEND_URL` | Yes | URL of the backend API |
| `OPENARG_BACKEND_API_KEY` | Yes | Shared API key for backend communication |
| `ALLOWED_EMAILS` | No | Comma-separated email whitelist |
| `ADMIN_EMAILS` | No | Comma-separated admin email list |
| `OPEN_BETA` | No | Set to `true` to allow public login |
| `OPEN_BETA_DOMAINS` | No | Comma-separated domain whitelist for open beta (e.g. `gmail.com,colossuslab.org`) |
| `DISABLE_AUTH` | No | Set to `true` ONLY for local development |
