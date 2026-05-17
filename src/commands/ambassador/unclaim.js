import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getActiveClaimsForUser } from '../../utils/database.js';
import { CATEGORIES } from '../../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('unclaim')
  .setDescription('Drop one of your active tasks back into the Blackbook');

export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const claims = await getActiveClaimsForUser(interaction.user.id);
  if (claims.length === 0) return interaction.editReply(`📭 You have no active tasks to unclaim.`);

  const embed = new EmbedBuilder().setTitle('↩️  Unclaim a Task').setDescription('Select the task you want to drop. It will return to the Blackbook for others to claim.').setColor(0xED4245);
  claims.forEach((c, i) => {
    const cat = CATEGORIES[c.category];
    embed.addFields({ name: `${i + 1}. ${c.title}`, value: `${cat.emoji} ${c.category}${c.deadline ? ` · ⏰ ${c.deadline}` : ''}`, inline: false });
  });

  const rows = [];
  for (let i = 0; i < Math.min(claims.length, 25); i += 5) {
    const chunk = claims.slice(i, i + 5);
    rows.push(new ActionRowBuilder().addComponents(
      chunk.map(c => new ButtonBuilder()
        .setCustomId(`unclaim_confirm_${c.claim_id}_${c.task_id}`)
        .setLabel(`Drop: ${c.title.slice(0, 25)}${c.title.length > 25 ? '…' : ''}`)
        .setStyle(ButtonStyle.Danger)
      )
    ));
  }
  await interaction.editReply({ embeds: [embed], components: rows });
}
