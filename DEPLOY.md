# Vaultix — Deploy to a Hostinger VPS (Docker Compose)

This is the recommended, reproducible way to run Vaultix in production.
Three containers run the whole app: **db** (PostgreSQL 16), **api** (Express + Prisma),
**web** (React build served by Nginx + reverse proxy).

## Prerequisites

- Hostinger VPS with **Ubuntu 24.04** (≥2 GB RAM recommended).
- A domain with an **A record** pointing to the VPS IP.
- (Optional) Gmail + App Password for invitation emails.

## 1. On the VPS — install Docker once

```bash
ssh root@<your-vps-ip>

apt update && apt install -y ca-certificates curl
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" > /etc/apt/sources.list.d/docker.list

apt update && apt install -y docker-ce docker-compose-plugin
systemctl enable --now docker
```

## 2. Get the code

```bash
mkdir -p /var/www && cd /var/www
git clone https://github.com/AvinashSaripalli/vaultix.git vaultix
cd vaultix
```

## 3. Create the secrets file

```bash
cp .env.example .env
nano .env
```

Fill in **all** values. Generate JWT secrets with `openssl rand -base64 48`.

### Required variables

| Variable | Description |
|---|---|
| `DB_PASSWORD` | PostgreSQL password (any strong random string) |
| `JWT_ACCESS_SECRET` | Short-lived token secret (`openssl rand -base64 48`) |
| `JWT_REFRESH_SECRET` | Refresh token secret — **required**, server exits without it |
| `CLIENT_URL` | Must **exactly** match the origin users visit (CORS is strict) |
| `WEBAUTHN_RP_ID` | Domain only, no protocol — e.g. `vaultix.com` |
| `WEBAUTHN_ORIGIN` | Full URL — e.g. `https://vaultix.com` |

### Optional variables

| Variable | Description |
|---|---|
| `MAIL_USER` | Gmail address for invitation emails |
| `MAIL_PASS` | Gmail App Password (16 chars, not your real password) |
| `TRUST_PROXY` | Set to `true` when behind a reverse proxy (Nginx, Cloudflare) |

## 4. Deploy (first time or update — same command)

```bash
docker compose up -d --build
```

What happens: Postgres starts (health-checked) → API image builds, Prisma client
generates, `prisma migrate deploy` applies migrations, the server starts →
React builds with `VITE_API_URL=/api/v1` → Nginx starts serving it.

Check it:

```bash
docker compose ps
docker compose logs -f api
curl http://localhost/api/health   # → {"message":"API is running"}
```

The app is now live at `http://<your-vps-ip>`.

## 5. Add HTTPS (do once DNS resolves)

```bash
apt install -y certbot
certbot certonly --standalone -d your-domain.com -d www.your-domain.com --agree-tos -m you@example.com
```

Then uncomment the SSL server blocks in `client/nginx.conf`, and mount the certs +
expose port 443 in `docker-compose.yml`:

```yaml
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /etc/letsencrypt:/etc/letsencrypt:ro
```

Rebuild:

```bash
docker compose up -d --build
```

Auto-renew certs (add to root crontab with `crontab -e`):

```
0 3 * * * certbot renew --quiet --deploy-hook "docker compose -f /var/www/vaultix/docker-compose.yml restart web"
```

## 6. Create the first admin

Register your account through the UI, then promote it (no seed script exists):

```bash
docker exec vaultix-db-1 psql -U vaultix -d vaultix -c "UPDATE \"User\" SET role='ADMIN' WHERE email='you@example.com';"
```

Log out and back in. You can now create vaults, invite users, and manage the team.

## 7. Backups (daily, keep 14 days)

```bash
crontab -e
```

```
0 3 * * * docker exec vaultix-db-1 pg_dump -U vaultix vaultix | gzip > /var/backups/vaultix-$(date +\%F).sql.gz
0 4 * * * find /var/backups -name "vaultix-*.sql.gz" -mtime +14 -delete
```

Periodically download a copy off-server (`scp root@<ip>:/var/backups/... .`).
Password data is encrypted client-side, but emails/metadata are still worth backing up.

## 8. Everyday deploy workflow

```bash
cd /var/www/vaultix
git pull
docker compose up -d --build
```

Roll back to a previous release: `git checkout <old-tag>` then the same compose command.

## Features included

| Feature | Description |
|---|---|
| **Personal Vault** | Private passwords with AES-256-GCM client-side encryption |
| **Company Vaults** | Team-shared vaults with folder-level permissions |
| **Password Sharing** | RSA key-wrapping for secure cross-user sharing |
| **Vault Policies** | Admin-enforced rules: min strength, max age, blocked common passwords |
| **Password Health** | Strength analysis, age distribution, breach detection, recommendations |
| **Password Generator** | Configurable random password creation |
| **Activity Log** | Full audit trail of all vault actions |
| **2FA / WebAuthn** | FIDO2 hardware key + TOTP support |
| **Session Management** | View and revoke active sessions |
| **Vault Timeout** | Auto-lock after inactivity |
| **Import/Export** | CSV, Excel, Bitwarden JSON, and native JSON formats |
| **Trash & Restore** | Soft-delete with 30-day restore window |
| **Browser Extension** | Chrome extension for autofill |

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| API exits with `FATAL: Missing required environment variables` | `.env` missing a secret | Add `JWT_REFRESH_SECRET`, `docker compose up -d` |
| CORS errors in the browser | `CLIENT_URL` mismatch | Set it to the exact origin users visit, rebuild |
| 502 on `/api/` | Nginx can't reach api container | `docker compose logs api`; confirm `depends_on`/healthcheck |
| White screen on refresh of `/dashboard` | Missing SPA fallback | Nginx `try_files $uri $uri/ /index.html;` |
| SSL won't issue | DNS not propagated / port 80 blocked | `dig your-domain.com`; open ports 80/443 in cloud firewall |
| 401 loops in console | Expired refresh token | User must log out and log back in |
| WebAuthn 2FA fails | `WEBAUTHN_RP_ID` or `WEBAUTHN_ORIGIN` wrong | Must match deployed domain exactly |
