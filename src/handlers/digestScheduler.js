import cron from 'node-cron';
import { getTasksWithClaimCounts } from '../utils/database.js';
import { buildWeeklyDigestEmbed } from '../utils/embeds.js';

export function startDigestScheduler(client) {
  cron.schedule('0 9 * * 1', async () => {
    const digestChannelId = process.env.DIGEST_CHANNEL_ID;
    if (!digestChannelId) { console.warn('[Digest] DIGEST_CHANNEL_ID not set — skipping.'); return; }
    try {
      const tasks = await getTasksWithClaimCounts();
      const embed = buildWeeklyDigestEmbed(tasks);
      const channel = await client.channels.fetch(digestChannelId);
      await channel.send({ embeds: [embed] });
      console.log('[Digest] Weekly digest posted successfully.');
    } catch (err) { console.error('[Digest] Failed to post weekly digest:', err.message); }
  });
  console.log('[Digest] Weekly digest scheduler started (Mondays 09:00 UTC)');
}
