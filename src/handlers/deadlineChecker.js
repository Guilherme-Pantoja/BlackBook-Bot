import cron from 'node-cron';
import { EmbedBuilder } from 'discord.js';
import { getUnsubmittedClaimants, markExpiryWarned, removeTask } from '../utils/database.js';
import { formatCountdown, urgencyEmoji, extractUnix } from '../utils/deadline.js';
import { CATEGORIES } from '../utils/embeds.js';

const TWO_HOURS = 2 * 60 * 60 * 1000;

export function startDeadlineChecker(client) {
  cron.schedule('*/5 * * * *', async () => {
    await checkExpiryWarnings(client);
    await checkExpiredTasks(client);
  });
  console.log('[Deadline] Checker started (every 5 minutes)');
}

async function checkExpiryWarnings(client) {
  const now = Math.floor(Date.now() / 1000);
  const cutoff = Math.floor((Date.now() + TWO_HOURS) / 1000);

  // Get tasks expiring within 2 hours that haven't been warned
  const { getDb } = await import('../utils/database.js');
  const db = await getDb();

  // Query all tasks with deadlines and filter in JS using extractUnix
  // (since deadlines are now Discord tags, not comparable SQL strings directly)
  const stmt = db.prepare(`SELECT * FROM tasks WHERE deadline IS NOT NULL AND (warned_expiry IS NULL OR warned_expiry = 0)`);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();

  const expiringSoon = rows.filter(t => {
    const unix = extractUnix(t.deadline);
    return unix && unix > now && unix <= cutoff;
  });

  for (const task of expiringSoon) {
    const claimants = await getUnsubmittedClaimants(task.id);
    if (claimants.length === 0) { await markExpiryWarned(task.id); continue; }
    const cat = CATEGORIES[task.category];
    const countdown = formatCountdown(task.deadline);
    for (const claimant of claimants) {
      try {
        const user = await client.users.fetch(claimant.user_id);
        await user.send([
          `${urgencyEmoji(task.deadline)} **Deadline Warning — Task expiring soon!**`,
          ``,
          `Your task **${task.title}** (${cat.emoji} ${task.category}) expires ${countdown}.`,
          ``,
          `Submit your proof now with \`/submit\` before time runs out!`,
        ].join('\n'));
      } catch (err) { console.error(`[Deadline] Could not DM ${claimant.username}:`, err.message); }
    }
    await markExpiryWarned(task.id);
    console.log(`[Deadline] Sent 2h warning for task #${task.id} to ${claimants.length} ambassador(s)`);
  }
}

async function checkExpiredTasks(client) {
  const now = Math.floor(Date.now() / 1000);

  const { getDb } = await import('../utils/database.js');
  const db = await getDb();

  const stmt = db.prepare(`SELECT * FROM tasks WHERE deadline IS NOT NULL`);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();

  const expired = rows.filter(t => {
    const unix = extractUnix(t.deadline);
    return unix && unix <= now;
  });

  for (const task of expired) {
    const claimants = await getUnsubmittedClaimants(task.id);
    const cat = CATEGORIES[task.category];

    for (const claimant of claimants) {
      try {
        const user = await client.users.fetch(claimant.user_id);
        await user.send([
          `⛔ **Task Expired — ${task.title}**`,
          ``,
          `Unfortunately your task has expired and has been removed from the Blackbook.`,
          `Keep an eye out for new tasks — new ones drop regularly!`,
        ].join('\n'));
      } catch (err) { console.error(`[Deadline] Could not DM ${claimant.username}:`, err.message); }
    }

    const logChannelId = process.env.TASK_LOG_CHANNEL_ID;
    if (logChannelId) {
      try {
        const logChannel = await client.channels.fetch(logChannelId);
        await logChannel.send({ embeds: [
          new EmbedBuilder()
            .setTitle(`⛔  Task Expired — Auto Removed`)
            .setColor(0xED4245)
            .addFields(
              { name: 'Task', value: `#${task.id} — ${task.title}`, inline: true },
              { name: 'Category', value: `${cat.emoji} ${task.category}`, inline: true },
              { name: 'Claimants notified', value: `${claimants.length}`, inline: true },
            )
            .setTimestamp()
        ]});
      } catch (err) { console.error('[Deadline] Could not post expiry log:', err.message); }
    }

    await removeTask(task.id);
    console.log(`[Deadline] Task #${task.id} "${task.title}" expired and removed`);
  }
}
