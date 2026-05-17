import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getActiveClaimsForUser } from '../../utils/database.js';
import { CATEGORIES } from '../../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('submit')
  .setDescription('Submit proof of completion for one of your active tasks');

export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const claims = await getActiveClaimsForUser(interaction.user.id);
  if (claims.length === 0) return interaction.editReply(`📭 You have no active tasks to submit.\nClaim a task first with \`/blackbook\`!`);

  const embed = new EmbedBuilder().setTitle('📤  Submit a Task').setDescription('Select the task you want to submit proof for:').setColor(0x5865F2);
  claims.forEach((c, i) => {
    const cat = CATEGORIES[c.category];
    embed.addFields({ name: `${i + 1}. ${c.title}`, value: `${cat.emoji} ${c.category}${c.deadline ? ` · ⏰ ${c.deadline}` : ''}`, inline: false });
  });

  const rows = [];
  for (let i = 0; i < Math.min(claims.length, 25); i += 5) {
    const chunk = claims.slice(i, i + 5);
    rows.push(new ActionRowBuilder().addComponents(
      chunk.map(c => new ButtonBuilder()
        .setCustomId(`submit_select_${c.claim_id}_${c.task_id}`)
        .setLabel(`${c.title.slice(0, 30)}${c.title.length > 30 ? '…' : ''}`)
        .setStyle(ButtonStyle.Primary)
      )
    ));
  }
  await interaction.editReply({ embeds: [embed], components: rows });
}
