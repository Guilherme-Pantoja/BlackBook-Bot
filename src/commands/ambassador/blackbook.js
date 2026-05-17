import { SlashCommandBuilder } from 'discord.js';
import { buildBlackbookEmbed, buildCategoryButtons } from '../../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('blackbook')
  .setDescription('Browse and claim available ambassador tasks');

export async function execute(interaction) {
  await interaction.reply({ embeds: [buildBlackbookEmbed()], components: [buildCategoryButtons()], ephemeral: true });
}
