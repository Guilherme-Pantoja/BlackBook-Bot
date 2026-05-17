# 📖 BlackBook Bot

A Discord bot for ambassador programs. Ambassadors browse and claim tasks by category, submit proof for review, and get notified on approval. Admins manage tasks with slash commands, templates, deadlines, and a full review queue — all inside Discord. Built with Discord.js and Node.js.

---

## Commands

| Who | Command | What it does |
|-----|---------|-------------|
| Ambassador | `/blackbook` | Opens the task browser with 3 category buttons |
| Ambassador | `/submit` | Shows active claimed tasks — pick one to submit proof |
| Ambassador | `/unclaim` | Shows active claimed tasks — pick one to drop |
| Admin | `/addtask custom` | Opens a form to create a fully custom task |
| Admin | `/addtask template` | Create a task from a pre-built template |
| Admin | `/taskboard` | View all tasks, claimants, deadlines and countdowns |
| Admin | `/removetask` | Remove a task by ID |
| Admin | `/cleartasks` | Wipe tasks by category or all at once (with confirmation) |
| Auto | — | Weekly digest posted every Monday at 9am UTC |
| Auto | — | 2-hour deadline warning DM sent to unsubmitted claimants |
| Auto | — | Expired tasks auto-removed, claimants notified by DM |

---

## Task Templates
- 📣 Amplify Post — just paste a URL
- 🌍 Welcome New Members
- 🎨 Make a Meme
- 🧪 Beta Testing — supports slot limits

---

## Setup

### 1. Create a Discord Bot
1. Go to [discord.com/developers/applications](https://discord.com/developers/applications)
2. New Application → Bot → Reset Token → copy it
3. Enable **Server Members Intent** and **Message Content Intent**
4. OAuth2 → URL Generator → Scopes: `bot` + `applications.commands` → invite to your server

### 2. Configure Environment
```bash
cp .env.example .env
```

Fill in your `.env`:
```env
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_application_id_here
GUILD_ID=your_guild_id_here
TASK_LOG_CHANNEL_ID=your_private_log_channel_id
DIGEST_CHANNEL_ID=your_digest_channel_id
ADMIN_ROLE_ID=your_admin_role_id
ADMIN_ROLE_ID_2=your_second_admin_role_id_here
```

### 3. Install & Run
```bash
npm install
npm run deploy   # Register slash commands (run once per server)
npm start
```

### 4. Hosting (24/7)
Push to GitHub and connect to [Railway](https://railway.app) — add your `.env` values as environment variables. Railway auto-redeploys on every push.

---

## Deadline Formats
- `48h` or `48 hours`
- `2d` or `2 days`
- `1w` or `1 week`
- `April 27`

---

## Data
All tasks, claims and submissions are stored in `data/blackbook.db`. Back this file up before any update to preserve history.
