import {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ModalBuilder, TextInputBuilder, TextInputStyle,
} from 'discord.js';
import { buildTaskListEmbed, buildClaimConfirmEmbed, buildClaimLogEmbed, CATEGORIES } from '../utils/embeds.js';
import {
  getTasksByCategory, getTaskById, claimTask, getClaimCount,
  getSubmission, approveSubmission, rejectSubmission,
  unclaimTask, clearTasksByCategory, clearAllTasks,
  hasActiveClaimOnTask,
} from '../utils/database.js';

export async function handleButton(interaction, client) {
  const { customId } = interaction;

  // ── Browse category ───────────────────────────────────────────────────────
  if (customId.startsWith('blackbook_category_')) {
    const category = customId.replace('blackbook_category_', '');
    const tasks = await getTasksByCategory(category);
    const { embed, rows } = buildTaskListEmbed(category, tasks);
    return interaction.reply({ embeds: [embed], components: rows, ephemeral: true });
  }

  // ── Claim task ────────────────────────────────────────────────────────────
  if (customId.startsWith('blackbook_claim_')) {
    await interaction.deferReply({ ephemeral: true });
    const taskId = parseInt(customId.replace('blackbook_claim_', ''), 10);
    const task = await getTaskById(taskId);

    // FIX: task may have been deleted while menu was open
    if (!task) return interaction.editReply('❌ This task no longer exists — it may have been removed. Run `/blackbook` to see current tasks.');

    // FIX: prevent claiming the same task twice
    const alreadyClaimed = await hasActiveClaimOnTask(taskId, interaction.user.id);
    if (alreadyClaimed) return interaction.editReply('⚠️ You already have this task claimed! Use `/mytasks` to check your active tasks, or `/submit` to submit it.');

    // Check slots
    if (task.slots) {
      const count = await getClaimCount(taskId);
      if (count >= task.slots) return interaction.editReply(`❌ Sorry, all **${task.slots} spots** for this task are taken!`);
    }

    await claimTask({ taskId, userId: interaction.user.id, username: interaction.user.username });
    await interaction.editReply({ embeds: [buildClaimConfirmEmbed(task, interaction.user)] });

    const logChannelId = process.env.TASK_LOG_CHANNEL_ID;
    if (logChannelId) {
      try {
        const logChannel = await client.channels.fetch(logChannelId);
        await logChannel.send({ embeds: [buildClaimLogEmbed(task, interaction.user)] });
      } catch (err) { console.error('[Claim log]', err.message); }
    }
    return;
  }

  // ── Submit: pick task ─────────────────────────────────────────────────────
  if (customId.startsWith('submit_select_')) {
    const parts   = customId.replace('submit_select_', '').split('_');
    const claimId = parseInt(parts[0], 10);
    const taskId  = parseInt(parts[1], 10);
    const task    = await getTaskById(taskId);

    // FIX: graceful error if task was deleted while submit menu was open
    if (!task) {
      return interaction.reply({
        content: '❌ This task no longer exists — it was likely removed by an admin. Use `/mytasks` to see your current tasks.',
        ephemeral: true,
      });
    }

    // FIX: modal title strictly under 45 chars using only task ID
    const modal = new ModalBuilder()
      .setCustomId(`modal_submit_${claimId}_${taskId}`)
      .setTitle(`Submit Task #${taskId}`);

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('proof')
          .setLabel('Proof of completion')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('Describe what you did, paste a link, or add a screenshot URL')
          .setRequired(true)
          .setMaxLength(500)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('image_url')
          .setLabel('Screenshot URL (optional)')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('https://imgur.com/...')
          .setRequired(false)
      ),
    );
    return interaction.showModal(modal);
  }

  // ── Unclaim ───────────────────────────────────────────────────────────────
  if (customId.startsWith('unclaim_confirm_')) {
    await interaction.deferUpdate();
    const parts  = customId.replace('unclaim_confirm_', '').split('_');
    const taskId = parseInt(parts[1], 10);
    const task   = await getTaskById(taskId);
    await unclaimTask({ taskId, userId: interaction.user.id });
    await interaction.editReply({
      embeds: [new EmbedBuilder().setTitle('↩️  Task Unclaimed').setDescription(`**${task?.title ?? 'Task'}** has been returned to the Blackbook.`).setColor(0xED4245)],
      components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('unclaimed_done').setLabel('↩️  Dropped').setStyle(ButtonStyle.Secondary).setDisabled(true))],
    });
    return;
  }

  // ── Approve submission ────────────────────────────────────────────────────
  if (customId.startsWith('approve_submission_')) {
    await interaction.deferUpdate();
    const submissionId = parseInt(customId.replace('approve_submission_', ''), 10);
    const submission = await getSubmission(submissionId);
    if (!submission) return interaction.followUp({ content: `❌ Submission #${submissionId} not found.`, ephemeral: true });
    await approveSubmission(submissionId);
    const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
      .setTitle(`✅  Submission #${submissionId} — Approved`).setColor(0x57F287)
      .addFields({ name: 'Reviewed by', value: `<@${interaction.user.id}>`, inline: true });
    const disabledRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('done_approve').setLabel('✅  Approved').setStyle(ButtonStyle.Success).setDisabled(true),
      new ButtonBuilder().setCustomId('done_reject').setLabel('❌  Reject').setStyle(ButtonStyle.Danger).setDisabled(true),
    );
    await interaction.editReply({ embeds: [updatedEmbed], components: [disabledRow] });
    try { const user = await client.users.fetch(submission.user_id); await user.send(`✅ **Your submission has been approved!**\nGreat work on Task #${submission.task_id}. Keep it up, Ambassador! 🎉`); } catch (err) { console.error('[Approve DM]', err.message); }
    return;
  }

  // ── Reject submission ─────────────────────────────────────────────────────
  if (customId.startsWith('reject_submission_')) {
    await interaction.deferUpdate();
    const submissionId = parseInt(customId.replace('reject_submission_', ''), 10);
    const submission = await getSubmission(submissionId);
    if (!submission) return interaction.followUp({ content: `❌ Submission #${submissionId} not found.`, ephemeral: true });
    await rejectSubmission(submissionId);
    const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
      .setTitle(`❌  Submission #${submissionId} — Rejected`).setColor(0xED4245)
      .addFields({ name: 'Reviewed by', value: `<@${interaction.user.id}>`, inline: true });
    const disabledRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('done_approve').setLabel('✅  Approve').setStyle(ButtonStyle.Success).setDisabled(true),
      new ButtonBuilder().setCustomId('done_reject').setLabel('❌  Rejected').setStyle(ButtonStyle.Danger).setDisabled(true),
    );
    await interaction.editReply({ embeds: [updatedEmbed], components: [disabledRow] });
    try { const user = await client.users.fetch(submission.user_id); await user.send(`❌ **Your submission was not approved.**\nTask #${submission.task_id} needs another look. It's back in the Blackbook — feel free to redo it and resubmit with \`/submit\`.`); } catch (err) { console.error('[Reject DM]', err.message); }
    return;
  }

  // ── Cleartasks confirm ────────────────────────────────────────────────────
  if (customId.startsWith('cleartasks_confirm_')) {
    await interaction.deferUpdate();
    const target = customId.replace('cleartasks_confirm_', '');
    if (target === 'all') { await clearAllTasks(); } else { await clearTasksByCategory(target); }
    await interaction.editReply({
      embeds: [new EmbedBuilder().setTitle('🧹  Board Cleared').setDescription(target === 'all' ? 'All tasks wiped. Ready for the next season.' : `All **${target}** tasks cleared.`).setColor(0x57F287)],
      components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('clear_done').setLabel('✅  Done').setStyle(ButtonStyle.Secondary).setDisabled(true))],
    });
    return;
  }

  // ── Cleartasks cancel ─────────────────────────────────────────────────────
  if (customId === 'cleartasks_cancel') {
    await interaction.deferUpdate();
    await interaction.editReply({ embeds: [new EmbedBuilder().setTitle('↩️  Cancelled').setDescription('No tasks were deleted.').setColor(0x57F287)], components: [] });
    return;
  }
}
