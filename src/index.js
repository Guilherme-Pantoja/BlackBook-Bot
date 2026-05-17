import 'dotenv/config';
import { Client, GatewayIntentBits, Collection, Events } from 'discord.js';
import { handleButton } from './handlers/buttonHandler.js';
import { handleModal } from './handlers/modalHandler.js';
import { startDigestScheduler } from './handlers/digestScheduler.js';
import { startDeadlineChecker } from './handlers/deadlineChecker.js';

import * as blackbook  from './commands/ambassador/blackbook.js';
import * as submit     from './commands/ambassador/submit.js';
import * as unclaim    from './commands/ambassador/unclaim.js';
import * as mytasks   from './commands/ambassador/mytasks.js';
import * as addtask    from './commands/admin/addtask.js';
import * as removetask from './commands/admin/removetask.js';
import * as taskboard  from './commands/admin/taskboard.js';
import * as cleartasks from './commands/admin/cleartasks.js';

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.DirectMessages] });
client.commands = new Collection();
for (const cmd of [blackbook, submit, unclaim, mytasks, addtask, removetask, taskboard, cleartasks]) {
  client.commands.set(cmd.data.name, cmd);
}

client.once(Events.ClientReady, (c) => {
  console.log(`✅  Logged in as ${c.user.tag}`);
  startDigestScheduler(client);
  startDeadlineChecker(client);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    const adminCommands = ['addtask', 'removetask', 'taskboard', 'cleartasks'];
    if (adminCommands.includes(interaction.commandName)) {
      const adminRoleId  = process.env.ADMIN_ROLE_ID;
      const adminRoleId2 = process.env.ADMIN_ROLE_ID_2;
      const hasRole1 = adminRoleId  && interaction.member.roles.cache.has(adminRoleId);
      const hasRole2 = adminRoleId2 && interaction.member.roles.cache.has(adminRoleId2);
      if (!hasRole1 && !hasRole2) return interaction.reply({ content: '🔒 You need the admin role to use this command.', ephemeral: true });
    }
    try {
      await command.execute(interaction);
    } catch (err) {
      console.error(`[Command error] /${interaction.commandName}:`, err);
      const msg = { content: '❌ Something went wrong.', ephemeral: true };
      if (interaction.replied || interaction.deferred) await interaction.followUp(msg);
      else await interaction.reply(msg);
    }
    return;
  }
  if (interaction.isButton()) {
    try { await handleButton(interaction, client); }
    catch (err) {
      console.error('[Button error]:', err);
      const msg = { content: '❌ Something went wrong. Please try again.', ephemeral: true };
      if (interaction.replied || interaction.deferred) await interaction.followUp(msg);
      else await interaction.reply(msg);
    }
    return;
  }
  if (interaction.isModalSubmit()) {
    try { await handleModal(interaction, client); }
    catch (err) {
      console.error('[Modal error]:', err);
      const msg = { content: '❌ Something went wrong. Please try again.', ephemeral: true };
      if (interaction.replied || interaction.deferred) await interaction.followUp(msg);
      else await interaction.reply(msg);
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
