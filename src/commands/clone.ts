import { Command, command, Context, ExpectedError, metadata, param } from 'clime';
import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import simpleGit from 'simple-git';
import Spinners from 'spinnies';
import { Fraternal } from '../fraternal';
import { tempDir } from '../utils/tempDir';

@command({
  description:
    'Create a new project from a template. The generated project will be put in a new folder at the current working directory.',
})
class CloneCommand extends Command {
  @metadata
  async execute(
    @param({
      description: 'A git repository url or path to a local folder containing a fraternal.js file',
      required: true,
    })
    template: string,
    context: Context
  ) {
    template = template.trim();
    const git = simpleGit();
    const spinners = new Spinners();

    let isLocalTemplate = false;
    const templateDir = path.join(tempDir(), `template_${Date.now()}`);
    if (template.startsWith('http') && template.endsWith('.git')) {
      spinners.add('clone', {
        text: `Cloning ${template}`,
      });

      try {
        await git.clone(template, templateDir, { '--depth': 1 });
        await fs.remove(path.join(templateDir, '.git'));
      } catch (err) {
        spinners.fail('clone', { text: 'Failed to clone' });

        throw new ExpectedError(
          `Could not clone ${template}, make sure this is a valid git url and that you have permission to clone it`
        );
      }
    } else {
      if (template.startsWith('~')) {
        template = template.replace('~', os.homedir());
      }

      isLocalTemplate = true;
      spinners.add('clone', {
        text: `Copying ${template} to temp directory`,
      });
      await fs.move(path.resolve(template), templateDir);
    }

    spinners.succeed('clone', { text: `Cloned ${template}` });

    const fraternalDir = path.resolve(__dirname, '../..');
    await fs.ensureSymlink(fraternalDir, path.join(templateDir, 'node_modules/fraternal'));

    let fraternal: Fraternal<any>;
    try {
      fraternal = require(path.join(templateDir, 'fraternal.js'));
    } catch (err) {
      console.error(err);
      if (isLocalTemplate) {
        throw new ExpectedError(`Missing fraternal.js file at ${templateDir}`);
      } else {
        throw new ExpectedError(`The cloned repo does not have a fraternal.js file`);
      }
    }

    await fraternal.execute(context.cwd, templateDir);
  }
}

export default CloneCommand;
