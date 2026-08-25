# 📖 BlackBook Bot

A Discord bot for ambassador programs. Ambassadors browse and claim tasks by category, submit proof for review, and get notified on approval. Admins manage tasks with slash commands, templates, deadlines, and a full review queue — all inside Discord. Built with Discord.js and Node.js.

---

## 🔀 Choosing Your Version

| Version | Best for | Key difference |
|---------|----------|----------------|
| **[v1.3.0](https://github.com/Guilherme-Pantoja/BlackBook-Bot/releases/tag/v1.3.0)** | Most open source projects | Single-tier — all members access the same task board |
| **[v1.4.0+](https://github.com/Guilherme-Pantoja/BlackBook-Bot/releases/tag/v1.4.0)** | Tiered community programs | Two-tier — Cubs entry level + Ambassador rank with graduation mechanic |

**If you are building a general ambassador or community task bot → use v1.3.0.**
It is simpler, requires fewer role configurations, and works out of the box for any community.

**If you run a tiered program with entry-level members who graduate into a higher rank → use v1.4.0+.**
This version is tailored to the BAT Ambassador Program structure but can be adapted for similar setups.

---

## Commands

| Who | Command | What it does |
|-----|---------|-------------|
| Ambassador | `/blackbook` | Opens the task browser — Cubs see their section, Ambassadors see theirs |
| Ambassador | `/mytasks` | View all your claimed tasks and their current status |
| Ambassador | `/submit` | Pick an active task and submit proof of completion |
| Ambassador | `/unclaim` | Drop an active task back into the Blackbook |
| Admin | `/addtask custom` | Opens a form to create a fully custom task |
| Admin | `/addtask template` | Create a task from a pre-built template |
| Admin | `/taskboard` | View all tasks, claimants, and deadlines |
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
- 🐾 Cubs Task *(v1.4.0+ only)*

---

## Deadline Formats
Deadlines convert to Discord's native live countdown automatically:
- `48h` or `48 hours`
- `2d` or `2 days`
- `1w` or `1 week`
- `April 27`

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
ADMIN_ROLE_ID_2=your_second_admin_role_id

# v1.4.0+ only — remove these for v1.3.0
AMBASSADOR_ROLE_ID=your_ambassador_role_id
CUBS_ROLE_ID=your_cubs_role_id
GRADUATION_NOTIFY_ROLE_ID_1=your_first_notify_role_id
GRADUATION_NOTIFY_ROLE_ID_2=your_second_notify_role_id
GRADUATION_THRESHOLD=3
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

## Data
All tasks, claims and submissions are stored in `data/blackbook.db`. Back this file up before any update to preserve history.

---

## Version History

| Version | Highlights |
|---------|-----------|
| **v1.0.0** | Core bot — task management, claim/submit flow, admin review system |
| **v1.1.0** | Live deadline countdowns, auto-expiry, 2-hour warning DMs |
| **v1.2.0** | `/unclaim`, `/cleartasks` confirmation prompt, database migration fix |
| **v1.3.0** ⭐ *recommended for general use* | Discord native timestamps, `/mytasks`, duplicate claim prevention, button number fix |
| **v1.4.0** | Cubs/Ambassador two-tier system, graduation mechanic, role gates — tailored for tiered programs |


---


**Privacy Policy — BlackBook Bot**
_Last updated: May 2026_

BlackBook Bot is an open source Discord bot developed and maintained by the BAT Ambassador Program team.
Source code: https://github.com/Guilherme-Pantoja/BlackBook-Bot

---

**What we store**
The bot stores only what is necessary to run the task system: your Discord User ID, your username,
tasks you claim, and proof submissions you make. No emails, real names, passwords, or payment
information are ever collected.

**How it's used**
Your data is used exclusively to operate the BlackBook — tracking task claims, routing submissions
for admin review, and sending you DM notifications about deadlines and submission outcomes. Nothing else.

**Where it's stored**
All data lives in a local SQLite database on the hosting server. It is not publicly accessible
and is never shared with or sold to third parties.

**Deletion**
Admins can clear task and claim data at any time. To request deletion of your personal data,
contact the BAT Ambassador Program team directly via Discord.

**Third parties**
The bot runs on Discord and is hosted on Railway. Their respective privacy policies apply:
discord.com/privacy — railway.app/legal/privacy
