import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { addTask, getTaskById, addSubmission } from '../utils/database.js';
import { CATEGORIES, TEMPLATES } from '../utils/embeds.js';
import { parseDeadline } from '../utils/deadline.js';

const VALID_CATEGORIES = ['community', 'outreach', 'content'];

export async function handleModal(interaction, client) {
  const { customId } = interaction;

  // ── Custom task ───────────────────────────────────────────────────────────
  if (customId === 'modal_addtask_custom') {
    await interaction.deferReply({ ephemeral: true });
    const rawCategory = interaction.fields.getTextInputValue('category').toLowerCase().trim();
    const title       = interaction.fields.getTextInputValue('title').trim();
    const description = interaction.fields.getTextInputValue('description').trim();
    const rawDeadline = interaction.fields.getTextInputValue('deadline').trim();
    const rawSlots    = interaction.fields.getTextInputValue('slots').trim();
    const slots       = rawSlots ? parseInt(rawSlots, 10) : null;

    if (!VALID_CATEGORIES.includes(rawCategory)) {
      return interaction.editReply(`❌ Invalid category **"${rawCategory}"**. Use: \`community\`, \`outreach\`, or \`content\`.`);
    }
    if (rawSlots && isNaN(slots)) {
      return interaction.editReply(`❌ Slots must be a number (e.g. \`6\`), or leave blank for unlimited.`);
    }

    // FIX: always parse deadline to ISO — if unparseable, warn the admin
    let deadline = null;
    let deadlineDisplay = null;
    if (rawDeadline) {
      deadline = parseDeadline(rawDeadline);
      if (!deadline) {
        return interaction.editReply(`❌ Couldn't parse deadline **"${rawDeadline}"**.\nUse formats like: \`48h\`, \`2d\`, \`1 week\`, \`April 27\`.`);
      }
      deadlineDisplay = rawDeadline;
    }

    const result = await addTask({ category: rawCategory, title, description, deadline, slots, createdBy: interaction.user.id });
    const cat = CATEGORIES[rawCategory];
    return interaction.editReply(`✅ Task **#${result.lastInsertRowid}** added to ${cat.emoji} **${rawCategory}**:\n> **${title}**${deadlineDisplay ? `\n> ⏰ ${deadlineDisplay}` : ''}${slots ? `\n> 👥 Limited to **${slots} spots**` : ''}`);
  }

  // ── Template task ─────────────────────────────────────────────────────────
  if (customId.startsWith('modal_addtask_template_')) {
    await interaction.deferReply({ ephemeral: true });
    const parts = customId.replace('modal_addtask_template_', '').split('_');
    const slotsFromId = parseInt(parts.pop(), 10);
    const templateKey = parts.join('_');
    const slots = slotsFromId > 0 ? slotsFromId : null;
    const template = TEMPLATES[templateKey];
    if (!template) return interaction.editReply('❌ Unknown template. Please try again.');

    const vars = {};
    for (const v of template.variables) { vars[v.key] = interaction.fields.getTextInputValue(v.key).trim(); }
    const rawDeadlineT = interaction.fields.getTextInputValue('deadline').trim();

    let deadline = null;
    if (rawDeadlineT) {
      deadline = parseDeadline(rawDeadlineT);
      if (!deadline) return interaction.editReply(`❌ Couldn't parse deadline **"${rawDeadlineT}"**.\nUse formats like: \`48h\`, \`2d\`, \`1 week\`, \`April 27\`.`);
    }

    const result = await addTask({ category: template.category, title: template.titleFn(vars), description: template.descriptionFn(vars), deadline, slots, createdBy: interaction.user.id });
    const cat = CATEGORIES[template.category];
    return interaction.editReply(`✅ Task **#${result.lastInsertRowid}** added to ${cat.emoji} **${template.category}**:\n> **${template.titleFn(vars)}**${rawDeadlineT ? `\n> ⏰ ${rawDeadlineT}` : ''}${slots ? `\n> 👥 Limited to **${slots} spots**` : ''}`);
  }

  // ── Submit proof ──────────────────────────────────────────────────────────
  if (customId.startsWith('modal_submit_')) {
    await interaction.deferReply({ ephemeral: true });
    const parts    = customId.replace('modal_submit_', '').split('_');
    const claimId  = parseInt(parts[0], 10);
    const taskId   = parseInt(parts[1], 10);
    const proof    = interaction.fields.getTextInputValue('proof').trim();
    const imageUrl = interaction.fields.getTextInputValue('image_url').trim() || null;

    // FIX: graceful error if task deleted before modal submitted
    const task = await getTaskById(taskId);
    if (!task) return interaction.editReply(`❌ This task no longer exists. It may have been removed by an admin.`);

    const result = await addSubmission({ taskId, claimId, userId: interaction.user.id, username: interaction.user.username, proof, imageUrl });
    const submissionId = result.lastInsertRowid;
    console.log(`[Submit] Submission #${submissionId} created for task #${taskId} by ${interaction.user.username}`);

    const cat = CATEGORIES[task.category];
    await interaction.editReply([
      `✅ **Mission submitted for Vanguard review.**`,
      `> Task: **${task.title}**`,
      ``,
      `Your active slot is clear — you may claim another task.`,
      `You'll receive a DM once it's reviewed.`,
    ].join('\n'));

    // Post review card to admin channel
    const reviewChannelId = process.env.TASK_LOG_CHANNEL_ID;
    if (reviewChannelId) {
      try {
        console.log(`[Submit] Posting to review channel: ${reviewChannelId}`);
        const reviewChannel = await client.channels.fetch(reviewChannelId);
        const reviewEmbed = new EmbedBuilder()
          .setTitle(`📥  Submission #${submissionId} — Review Required`)
          .setColor(0xFEE75C)
          .addFields(
            { name: 'Ambassador', value: `<@${interaction.user.id}> (${interaction.user.username})`, inline: true },
            { name: 'Task', value: `#${task.id} — ${task.title}`, inline: true },
            { name: 'Category', value: `${cat.emoji} ${task.category}`, inline: true },
            { name: 'Proof', value: proof, inline: false },
          )
          .setTimestamp();
        const isValidUrl = imageUrl && imageUrl.startsWith('http');
        if (isValidUrl) { reviewEmbed.setImage(imageUrl); reviewEmbed.addFields({ name: 'Screenshot', value: `[View image](${imageUrl})`, inline: false }); }
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`approve_submission_${submissionId}`).setLabel('✅  Approve').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId(`reject_submission_${submissionId}`).setLabel('❌  Reject').setStyle(ButtonStyle.Danger),
        );
        await reviewChannel.send({ embeds: [reviewEmbed], components: [row] });
        console.log(`[Submit] Review card posted successfully for submission #${submissionId}`);
      } catch (err) {
        console.error('[Submission log] Failed to post review card:', err.message);
      }
    } else {
      console.warn('[Submit] TASK_LOG_CHANNEL_ID not set — review card not posted');
    }
  }
}
