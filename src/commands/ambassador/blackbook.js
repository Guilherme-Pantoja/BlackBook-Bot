import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { buildBlackbookEmbed, buildBlackbookButtons } from '../../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('blackbook')
  .setDescription('Browse and claim available tasks');

export async function execute(interaction) {
  const cubsRoleId       = process.env.CUBS_ROLE_ID;
  const ambassadorRoleId = process.env.AMBASSADOR_ROLE_ID;
  const adminRoleId      = process.env.ADMIN_ROLE_ID;
  const adminRoleId2     = process.env.ADMIN_ROLE_ID_2;

  const roles = interaction.member.roles.cache;

  const isCub     = cubsRoleId && roles.has(cubsRoleId);
  const isAdmin   = (adminRoleId  && roles.has(adminRoleId))
                 || (adminRoleId2 && roles.has(adminRoleId2));
  const isAmbassador = (ambassadorRoleId && roles.has(ambassadorRoleId)) || isAdmin;

  // No recognised role — gate them out
  if (!isCub && !isAmbassador) {
    const gateEmbed = new EmbedBuilder()
      .setTitle('📖  The Blackbook')
      .setDescription(
        'You do not have access to the Blackbook yet.\\n\\n' +
        'The Blackbook is available to **Cubs** and **Ambassadors** of the BAT Community program.\\n\\n' +
        'If you believe this is a mistake, please contact a team member.'
      )
      .setColor(0xED4245)
      .setFooter({ text: 'BAT Ambassador Program' });
    return interaction.reply({ embeds: [gateEmbed], ephemeral: true });
  }

  console.log(`[Blackbook] ${interaction.user.username} - isCub:${isCub} isAdmin:${isAdmin} isAmbassador:${isAmbassador}`);
  console.log(`[Blackbook] Roles: ${[...roles.keys()].join(',')}`);
  await interaction.reply({
    embeds: [buildBlackbookEmbed(isCub, isAdmin)],
    components: [buildBlackbookButtons(isCub, isAdmin)],
    ephemeral: true,
  });
}
