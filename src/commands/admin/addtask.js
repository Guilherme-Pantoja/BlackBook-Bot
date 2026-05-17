import { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';
import { TEMPLATES } from '../../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('addtask')
  .setDescription('[Admin] Add a new task to the Blackbook')
  .addSubcommand(sub => sub.setName('custom').setDescription('Create a fully custom task'))
  .addSubcommand(sub =>
    sub.setName('template')
      .setDescription('Create a task from a template')
      .addStringOption(opt => opt.setName('type').setDescription('Which template?').setRequired(true).addChoices(
        { name: '📣 Amplify Post', value: 'amplify_post' },
        { name: '🌍 Welcome New Members', value: 'welcome_members' },
        { name: '🎨 Make a Meme', value: 'make_meme' },
        { name: '🧪 Beta Testing', value: 'beta_test' },
      ))
      .addIntegerOption(opt => opt.setName('slots').setDescription('Max spots (leave blank = unlimited)').setRequired(false).setMinValue(1).setMaxValue(50))
  );

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();

  if (sub === 'custom') {
    const modal = new ModalBuilder().setCustomId('modal_addtask_custom').setTitle('Add Custom Task');
    modal.addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('category').setLabel('Category (community / outreach / content)').setStyle(TextInputStyle.Short).setPlaceholder('community').setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('title').setLabel('Task Title').setStyle(TextInputStyle.Short).setPlaceholder('e.g. Host Friday AMA').setRequired(true).setMaxLength(60)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('description').setLabel('Description').setStyle(TextInputStyle.Paragraph).setPlaceholder('What does this task involve?').setRequired(true).setMaxLength(300)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('deadline').setLabel('Deadline (optional)').setStyle(TextInputStyle.Short).setPlaceholder('e.g. 48h / 2 days / 1 week / April 27').setRequired(false)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('slots').setLabel('Max slots (optional, e.g. 6)').setStyle(TextInputStyle.Short).setPlaceholder('Leave blank for unlimited').setRequired(false)),
    );
    return interaction.showModal(modal);
  }

  if (sub === 'template') {
    const templateKey = interaction.options.getString('type');
    const slots = interaction.options.getInteger('slots') ?? null;
    const template = TEMPLATES[templateKey];
    const modal = new ModalBuilder().setCustomId(`modal_addtask_template_${templateKey}_${slots ?? 0}`).setTitle(template.name);
    const components = template.variables.map(v =>
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId(v.key).setLabel(v.label).setStyle(TextInputStyle.Short).setPlaceholder(v.placeholder).setRequired(!v.label.toLowerCase().includes('optional')))
    );
    components.push(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('deadline').setLabel('Deadline (optional)').setStyle(TextInputStyle.Short).setPlaceholder('e.g. 48h / 2 days / 1 week / April 27').setRequired(false)));
    modal.addComponents(...components);
    return interaction.showModal(modal);
  }
}
