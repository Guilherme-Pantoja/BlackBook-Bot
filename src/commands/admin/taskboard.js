import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getTasksWithClaimCounts, getClaimsForTask } from '../../utils/database.js';
import { CATEGORIES } from '../../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('taskboard')
  .setDescription('[Admin] View all active tasks, who claimed them, and deadlines')
  .addStringOption(opt => opt.setName('category').setDescription('Filter by category').setRequired(false).addChoices(
    { name: '🌍 Community', value: 'community' },
    { name: '📣 Outreach', value: 'outreach' },
    { name: '🎨 Content', value: 'content' },
  ));

export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const filter = interaction.options.getString('category');
  let tasks = await getTasksWithClaimCounts();
  if (filter) tasks = tasks.filter(t => t.category === filter);

  const embed = new EmbedBuilder().setTitle('🗂️  Task Board').setColor(0x2B2D31).setTimestamp().setFooter({ text: `${tasks.length} task${tasks.length !== 1 ? 's' : ''} active` });

  if (tasks.length === 0) { embed.setDescription('No tasks found. Use `/addtask` to add some!'); return interaction.editReply({ embeds: [embed] }); }

  const grouped = {};
  for (const task of tasks) { if (!grouped[task.category]) grouped[task.category] = []; grouped[task.category].push(task); }

  for (const [catKey, cat] of Object.entries(CATEGORIES)) {
    const catTasks = grouped[catKey];
    if (!catTasks?.length) continue;
    const lines = [];
    for (const t of catTasks) {
      const claims = await getClaimsForTask(t.id);
      const deadline = t.deadline ? ` · ⏰ ${t.deadline}` : '';
      const claimLine = claims.length > 0 ? `\n　　👤 ${claims.map(c => c.username).join(', ')}` : `\n　　👤 *Unclaimed*`;
      lines.push(`**#${t.id} ${t.title}**${deadline}${claimLine}`);
    }
    embed.addFields({ name: `${cat.emoji}  ${catKey.charAt(0).toUpperCase() + catKey.slice(1)} (${catTasks.length})`, value: lines.join('\n\n'), inline: false });
  }
  await interaction.editReply({ embeds: [embed] });
}
