# 🐉 Family Realm — Setup Guide

A private multiplayer RPG for your family, hosted on your local PC.

## Quick Start

### 1. Install Node.js
Download from https://nodejs.org (LTS version)

### 2. Install dependencies
```bash
cd family-rpg
npm install
```

### 3. Start the server
```bash
npm start
```

### 4. Open in browser
- **You:** http://localhost:3000
- **Family (same WiFi):** http://YOUR-LOCAL-IP:3000

## Finding Your Local IP
- Windows: run `ipconfig`, look for "IPv4 Address"
- Mac/Linux: run `ifconfig | grep "inet "`

## Remote Access (outside home WiFi)
- **ngrok** (easiest): Download from ngrok.com, run `ngrok http 3000`, share URL
- **Tailscale**: Free VPN overlay, install on all devices

## Default Admin Login
- Username: `admin`  Password: `admin123`
- Change after first login!

## Roles
| Role | Privileges |
|------|-----------|
| admin | Full access, manage users |
| gamemaster | Create/manage events, invite players |
| player | Chat, join events |

## Promote a user to GM (as admin, via curl)
```bash
curl -X PATCH http://localhost:3000/api/users/USERNAME/role \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role":"gamemaster"}'
```

## Dev mode (auto-restart)
```bash
npm run dev
```
