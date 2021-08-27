import { Command, command, Context, metadata, params } from 'clime';
import path from 'path';
import fs from 'fs-extra';

// TODO: Maybe we don't need this, instead we could have a "fraternal template" template that they could clone and manually move their files over

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
    await fs.writeFile(
      path.join(context.cwd, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          strict: true,
          checkJs: true,
          noEmit: true,
        },
      })
    );
  }
}

export default ConvertCommand;
