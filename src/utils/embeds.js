import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { formatCountdown, urgencyEmoji, isExpired } from './deadline.js';

export const CATEGORIES = {
  community: { label: '🌍  Community', color: 0x5865F2, emoji: '🌍', description: 'Engage with members, host events, welcome newcomers' },
  outreach:  { label: '📣  Outreach',  color: 0xEB459E, emoji: '📣', description: 'Grow the community, partnerships, social media' },
  content:   { label: '🎨  Content',   color: 0x57F287, emoji: '🎨', description: 'Create graphics, write posts, produce videos' },
  cubs:      { label: '🐾  Cubs',      color: 0xFEE75C, emoji: '🐾', description: 'Exclusive tasks for Cubs — complete 3 to become an Ambassador' },
};

export const TEMPLATES = {
  amplify_post:    { name: '📣 Amplify Post', category: 'outreach', titleFn: () => `Amplify Post`, descriptionFn: (v) => `Amplify this post to help us reach more people:\n${v.url}`, variables: [{ key: 'url', label: 'Post URL', placeholder: 'https://twitter.com/...' }] },
  welcome_members: { name: '🌍 Welcome New Members', category: 'community', titleFn: () => `Welcome New Members`, descriptionFn: (v) => `Welcome the new members who joined this week. Say hi, answer questions, and make them feel at home${v.channel ? ` in ${v.channel}` : ''}.`, variables: [{ key: 'channel', label: 'Channel (optional)', placeholder: '#welcome' }] },
  make_meme:       { name: '🎨 Make a Meme', category: 'content', titleFn: () => `Make a Meme`, descriptionFn: (v) => `Create a meme about this:\n${v.topic}`, variables: [{ key: 'topic', label: 'Topic or URL', placeholder: 'Our recent launch / https://...' }] },
  beta_test:       { name: '🧪 Beta Testing', category: 'community', titleFn: (v) => `Beta Test — ${v.feature}`, descriptionFn: (v) => `You've been selected to beta test **${v.feature}**. Test thoroughly and submit your feedback.${v.url ? `\n${v.url}` : ''}`, variables: [{ key: 'feature', label: 'Feature Name', placeholder: 'e.g. New Dashboard' }, { key: 'url', label: 'Feedback Form URL (optional)', placeholder: 'https://...' }] },
  cubs_task:       { name: '🐾 Cubs Task', category: 'cubs', titleFn: (v) => v.title, descriptionFn: (v) => v.description, variables: [{ key: 'title', label: 'Task Title', placeholder: 'e.g. Introduce yourself' }, { key: 'description', label: 'Task Description', placeholder: 'What does the cub need to do?' }] },
};

// ── Main /blackbook embed — two-tier selector ─────────────────────────────────
export function buildBlackbookEmbed(isCub, isAdmin) {
  let description, color, footer;
  if (isAdmin) {
    description = 'Admin view — both sections are available. Browse Cubs or Ambassador tasks.';
    color = 0x5865F2;
    footer = '👑 Admin access — full board visibility';
  } else if (isCub) {
    description = 'Welcome, Cub! Complete **3 tasks** from the Cubs section to earn your Ambassador rank.\nYour Ambassador tasks are waiting — graduate to unlock them.';
    color = 0xFEE75C;
    footer = '🐾 Complete 3 Cubs tasks to become an Ambassador';
  } else {
    description = 'Welcome, Ambassador. Select a section to browse available tasks.';
    color = 0x2B2D31;
    footer = '⚔️ Ambassador tasks — keep the community moving';
  }
  return new EmbedBuilder()
    .setTitle('📖  The Blackbook')
    .setDescription(description)
    .setColor(color)
    .setFooter({ text: footer })
    .setTimestamp();
}

export function buildBlackbookButtons(isCub, isAdmin) {
  // isAdmin = has admin role (sees both sections)
  // !isCub = regular ambassador (sees only ambassador section)
  const cubsEnabled       = isCub || isAdmin;
  const ambassadorEnabled = !isCub || isAdmin;

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('blackbook_section_cubs')
      .setLabel('🐾  Cubs Tasks')
      .setStyle(cubsEnabled ? ButtonStyle.Primary : ButtonStyle.Secondary)
      .setDisabled(!cubsEnabled),
    new ButtonBuilder()
      .setCustomId('blackbook_section_ambassador')
      .setLabel('⚔️  Ambassador Tasks')
      .setStyle(ambassadorEnabled ? ButtonStyle.Primary : ButtonStyle.Secondary)
      .setDisabled(!ambassadorEnabled),
  );
  return row;
}

// ── Ambassador category buttons ───────────────────────────────────────────────
export function buildCategoryButtons() {
  return new ActionRowBuilder().addComponents(
    Object.entries(CATEGORIES)
      .filter(([key]) => key !== 'cubs')
      .map(([key, cat]) =>
        new ButtonBuilder().setCustomId(`blackbook_category_${key}`).setLabel(cat.label).setStyle(ButtonStyle.Secondary)
      )
  );
}

// ── Cubs category button ──────────────────────────────────────────────────────
export function buildCubsCategoryButton() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('blackbook_category_cubs').setLabel('🐾  Browse Cubs Tasks').setStyle(ButtonStyle.Primary)
  );
}

// ── Task list embed ───────────────────────────────────────────────────────────
export function buildTaskListEmbed(category, tasks) {
  const cat = CATEGORIES[category];
  const embed = new EmbedBuilder()
    .setTitle(`${cat.emoji}  ${category === 'cubs' ? 'Cubs Tasks' : category.charAt(0).toUpperCase() + category.slice(1) + ' Tasks'}`)
    .setColor(cat.color);

  const valid = tasks
    .filter(t => !t.deadline || !isExpired(t.deadline))
    .sort((a, b) => {
      if (a.deadline && b.deadline) return new Date(a.deadline) - new Date(b.deadline);
      if (a.deadline) return -1;
      if (b.deadline) return 1;
      return 0;
    });

  const available = valid.filter(t => !t.slots || (t.claim_count ?? 0) < t.slots);

  if (available.length === 0) {
    embed.setDescription('No tasks available right now. Check back soon! 💪');
    return { embed, rows: [] };
  }

  embed.setDescription(`**${available.length} task${available.length > 1 ? 's' : ''} available.** Click a button below to claim one.`);

  available.forEach((task, i) => {
    const num = i + 1;
    const countdown   = formatCountdown(task.deadline);
    const emoji       = urgencyEmoji(task.deadline);
    const deadlineStr = countdown ? `\n${emoji} ${countdown}` : '';
    const slotsStr    = task.slots ? `\n👥 \`${task.claim_count ?? 0}/${task.slots} spots taken\`` : '';
    embed.addFields({ name: `${num}. ${task.title}  ·  ID #${task.id}`, value: task.description + deadlineStr + slotsStr, inline: false });
  });

  const rows = [];
  for (let i = 0; i < Math.min(available.length, 25); i += 5) {
    const chunk = available.slice(i, i + 5);
    const row = new ActionRowBuilder().addComponents(
      chunk.map((task, chunkIdx) => {
        const num = i + chunkIdx + 1;
        return new ButtonBuilder()
          .setCustomId(`blackbook_claim_${task.id}`)
          .setLabel(`${num}. Claim — ${task.title.slice(0, 22)}${task.title.length > 22 ? '…' : ''}`)
          .setStyle(ButtonStyle.Primary);
      })
    );
    rows.push(row);
  }
  return { embed, rows };
}

export function buildClaimConfirmEmbed(task, user) {
  const cat = CATEGORIES[task.category];
  const countdown = formatCountdown(task.deadline);
  const emoji = urgencyEmoji(task.deadline);
  return new EmbedBuilder()
    .setTitle('✅  Task Claimed!')
    .setColor(0x57F287)
    .setDescription(`You've successfully claimed **${task.title}**.`)
    .addFields(
      { name: 'Category', value: `${cat.emoji} ${task.category}`, inline: true },
      { name: 'Deadline', value: countdown ? `${emoji} ${countdown}` : 'No deadline', inline: true },
      { name: 'Description', value: task.description, inline: false },
    )
    .setFooter({ text: 'Good luck! The team has been notified.' })
    .setTimestamp();
}

export function buildClaimLogEmbed(task, user) {
  const cat = CATEGORIES[task.category];
  return new EmbedBuilder()
    .setTitle('📋  Task Claimed')
    .setColor(cat.color)
    .addFields(
      { name: 'Ambassador', value: `<@${user.id}> (${user.username})`, inline: true },
      { name: 'Task', value: `#${task.id} — ${task.title}`, inline: true },
      { name: 'Category', value: `${cat.emoji} ${task.category}`, inline: true },
    )
    .setTimestamp();
}

export function buildWeeklyDigestEmbed(tasksWithCounts) {
  const embed = new EmbedBuilder().setTitle('📅  Weekly Task Digest').setColor(0xFEE75C).setDescription('Here\'s a summary of all active tasks and their claim counts.').setTimestamp();
  for (const [catKey, cat] of Object.entries(CATEGORIES)) {
    const catTasks = tasksWithCounts.filter(t => t.category === catKey);
    if (catTasks.length === 0) {
      embed.addFields({ name: `${cat.emoji} ${catKey} — no tasks`, value: '*Empty*', inline: false });
    } else {
      const lines = catTasks.map(t => {
        const countdown = formatCountdown(t.deadline);
        const deadlineStr = countdown ? ` · ${urgencyEmoji(t.deadline)} ${countdown}` : '';
        const slotsStr = t.slots ? ` · 👥 ${t.claim_count}/${t.slots}` : ` · 👤 ${t.claim_count} claim${t.claim_count !== 1 ? 's' : ''}`;
        return `**#${t.id} ${t.title}**${deadlineStr}${slotsStr}`;
      }).join('\n');
      embed.addFields({ name: `${cat.emoji} ${catKey} (${catTasks.length})`, value: lines, inline: false });
    }
  }
  return embed;
}

// ── Graduation notification embed ─────────────────────────────────────────────
export function buildGraduationEmbed(user, approvedCount, threshold) {
  return new EmbedBuilder()
    .setTitle('🎓  Cub Ready to Graduate!')
    .setColor(0xFEE75C)
    .setDescription(`**${user.username}** has completed **${approvedCount}/${threshold}** approved tasks and is ready to become an Ambassador!`)
    .addFields(
      { name: 'User', value: `<@${user.id}>`, inline: true },
      { name: 'Approved Tasks', value: `${approvedCount}`, inline: true },
    )
    .setFooter({ text: 'Manually assign the Ambassador role to complete graduation' })
    .setTimestamp();
}
