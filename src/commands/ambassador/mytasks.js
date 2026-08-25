import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getDb } from '../../utils/database.js';
import { CATEGORIES } from '../../utils/embeds.js';
import { formatCountdown, urgencyEmoji } from '../../utils/deadline.js';

export const data = new SlashCommandBuilder()
  .setName('mytasks')
  .setDescription('View all your currently claimed tasks and their status');

export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const roles = interaction.member.roles.cache;
  const cubsRoleId       = process.env.CUBS_ROLE_ID;
  const ambassadorRoleId = process.env.AMBASSADOR_ROLE_ID;
  const adminRoleId      = process.env.ADMIN_ROLE_ID;
  const adminRoleId2     = process.env.ADMIN_ROLE_ID_2;
  const hasAccess = (cubsRoleId && roles.has(cubsRoleId))
                 || (ambassadorRoleId && roles.has(ambassadorRoleId))
                 || (adminRoleId && roles.has(adminRoleId))
                 || (adminRoleId2 && roles.has(adminRoleId2));
  if (!hasAccess) return interaction.reply({ content: '🔒 You do not have access to the Blackbook program yet.', ephemeral: true });

  const db = await getDb();

  const stmt = db.prepare(`
    SELECT c.id as claim_id, c.task_id, c.claimed_at,
           t.title, t.description, t.category, t.deadline,
           s.status as submission_status, s.submitted_at
    FROM claims c
    JOIN tasks t ON t.id = c.task_id
    LEFT JOIN submissions s ON s.id = (
      SELECT id FROM submissions
      WHERE claim_id = c.id
      ORDER BY submitted_at DESC
      LIMIT 1
    )
    WHERE c.user_id = ?
    ORDER BY c.claimed_at DESC
  `);
  stmt.bind([interaction.user.id]);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();

  if (rows.length === 0) return interaction.editReply(`📭 You haven't claimed any tasks yet.\nUse \`/blackbook\` to browse available tasks!`);

  const embed = new EmbedBuilder()
    .setTitle('📋  My Tasks')
    .setDescription(`You have **${rows.length}** task${rows.length > 1 ? 's' : ''} in your history.`)
    .setColor(0x5865F2)
    .setTimestamp();

  for (const row of rows) {
    const cat = CATEGORIES[row.category];
    const countdown = formatCountdown(row.deadline);
    const emoji = urgencyEmoji(row.deadline);
    let statusBadge;
    if (!row.submission_status)              statusBadge = `🟡 In Progress`;
    else if (row.submission_status === 'pending')  statusBadge = `🔵 Pending Review`;
    else if (row.submission_status === 'approved') statusBadge = `✅ Approved`;
    else if (row.submission_status === 'rejected') statusBadge = `❌ Rejected — resubmit with \`/submit\``;
    const deadlineStr = countdown ? `\n${emoji} ${countdown}` : '';
    const claimedDate = new Date(row.claimed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    embed.addFields({ name: `${cat.emoji} ${row.title}  ·  #${row.task_id}`, value: `${statusBadge}\nClaimed: ${claimedDate}${deadlineStr}`, inline: false });
  }

  embed.setFooter({ text: 'Use /submit to submit proof · /unclaim to drop a task' });
  await interaction.editReply({ embeds: [embed] });
}
