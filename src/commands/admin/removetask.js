import { SlashCommandBuilder } from 'discord.js';
import { getTaskById, removeTask } from '../../utils/database.js';

export const data = new SlashCommandBuilder()
  .setName('removetask')
  .setDescription('[Admin] Remove a task by ID')
  .addIntegerOption(opt => opt.setName('id').setDescription('Task ID (use /taskboard to find it)').setRequired(true).setMinValue(1));

export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const id = interaction.options.getInteger('id');
  const task = await getTaskById(id);
  if (!task) return interaction.editReply(`❌ No task found with ID **#${id}**.`);
  await removeTask(id);
  await interaction.editReply(`🗑️ Task **#${id} — ${task.title}** removed.`);
}
