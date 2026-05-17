import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('cleartasks')
  .setDescription('[Admin] Wipe the board — use at end of season')
  .addStringOption(opt => opt.setName('category').setDescription('Category to clear — leave blank to clear ALL').setRequired(false).addChoices(
    { name: '🌍 Community', value: 'community' },
    { name: '📣 Outreach', value: 'outreach' },
    { name: '🎨 Content', value: 'content' },
  ));

export async function execute(interaction) {
  const category = interaction.options.getString('category');
  const isAll = !category;
  const label = isAll ? 'ALL tasks' : `all **${category}** tasks`;
  const embed = new EmbedBuilder().setTitle('⚠️  Are you sure?').setDescription(`You are about to permanently delete **${label}** from the Blackbook.\n\nThis cannot be undone.`).setColor(0xED4245);
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`cleartasks_confirm_${category ?? 'all'}`).setLabel(`Yes, clear ${isAll ? 'everything' : category}`).setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('cleartasks_cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary),
  );
  await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
}
