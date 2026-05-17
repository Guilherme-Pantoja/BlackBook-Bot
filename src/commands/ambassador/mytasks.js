import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getDb } from '../../utils/database.js';
import { CATEGORIES } from '../../utils/embeds.js';
import { formatCountdown, urgencyEmoji } from '../../utils/deadline.js';

export const data = new SlashCommandBuilder()
  .setName('mytasks')
  .setDescription('View all your currently claimed tasks and their status');

export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const db = await getDb();

  // Get all claims for this user with task info and submission status
  const stmt = db.prepare(`
    SELECT
      c.id as claim_id,
      c.task_id,
      c.claimed_at,
      t.title,
      t.description,
      t.category,
      t.deadline,
      s.status as submission_status,
      s.submitted_at
    FROM claims c
    JOIN tasks t ON t.id = c.task_id
    LEFT JOIN submissions s ON s.claim_id = c.id
    WHERE c.user_id = ?
    ORDER BY c.claimed_at DESC
  `);
  stmt.bind([interaction.user.id]);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();

  if (rows.length === 0) {
    return interaction.editReply(`📭 You haven't claimed any tasks yet.\nUse \`/blackbook\` to browse available tasks!`);
  }

  const embed = new EmbedBuilder()
    .setTitle('📋  My Tasks')
    .setDescription(`You have **${rows.length}** task${rows.length > 1 ? 's' : ''} in your history.`)
    .setColor(0x5865F2)
    .setTimestamp();

  for (const row of rows) {
    const cat = CATEGORIES[row.category];
    const countdown = formatCountdown(row.deadline);
    const emoji = urgencyEmoji(row.deadline);

    // Status badge
    let statusBadge;
    if (!row.submission_status) {
      statusBadge = `🟡 In Progress`;
    } else if (row.submission_status === 'pending') {
      statusBadge = `🔵 Pending Review`;
    } else if (row.submission_status === 'approved') {
      statusBadge = `✅ Approved`;
    } else if (row.submission_status === 'rejected') {
      statusBadge = `❌ Rejected — resubmit with \`/submit\``;
    }

    const deadlineStr = countdown ? `\n${emoji} ${countdown}` : '';
    const claimedDate = new Date(row.claimed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

    embed.addFields({
      name: `${cat.emoji} ${row.title}  ·  #${row.task_id}`,
      value: `${statusBadge}\nClaimed: ${claimedDate}${deadlineStr}`,
      inline: false,
    });
  }

  embed.setFooter({ text: 'Use /submit to submit proof · /unclaim to drop a task' });
  await interaction.editReply({ embeds: [embed] });
}
