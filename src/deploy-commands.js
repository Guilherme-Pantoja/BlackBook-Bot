import 'dotenv/config';
import { REST, Routes } from 'discord.js';

import * as blackbook  from './commands/ambassador/blackbook.js';
import * as submit     from './commands/ambassador/submit.js';
import * as unclaim    from './commands/ambassador/unclaim.js';
import * as mytasks   from './commands/ambassador/mytasks.js';
import * as addtask    from './commands/admin/addtask.js';
import * as removetask from './commands/admin/removetask.js';
import * as taskboard  from './commands/admin/taskboard.js';
import * as cleartasks from './commands/admin/cleartasks.js';

const commands = [blackbook, submit, unclaim, mytasks, addtask, removetask, taskboard, cleartasks].map(cmd => cmd.data.toJSON());
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log(`Registering ${commands.length} slash commands…`);
    await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: commands });
    console.log('✅  Commands registered successfully.');
    commands.forEach(c => console.log(`  /${c.name} — ${c.description}`));
  } catch (err) {
    console.error('❌  Failed to deploy commands:', err);
    process.exit(1);
  }
})();
