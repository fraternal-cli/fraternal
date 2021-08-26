import { Command, command, Context, metadata, params } from 'clime';
import path from 'path';
import fs from 'fs-extra';

@command({ description: 'Convert the current folder into a template' })
class ConvertCommand extends Command {
  @metadata
  async execute(context: Context) {
    let entries = await fs.readdir(context.cwd);
    entries = entries.filter((entry) => entry !== '.git');

    for (const entry of entries) {
      await fs.move(path.join(context.cwd, entry), path.join(context.cwd, 'template', entry));
    }

    await fs.writeFile(path.join(context.cwd, 'fraternal.js'), '');
  }
}

export default ConvertCommand;
