import path from 'path';
import child from 'child_process';
import fs from 'fs-extra';
import { walk } from '@root/walk';
import inquirer from 'inquirer';
import gitIgnore from 'gitignore-parser';
import Spinners from 'spinnies';
import chalk from 'chalk';
import {
  Context,
  PromptOptions,
  FraternalOptions,
  Step,
  PromptStep,
  DeriveStep,
  ActionStep,
  ConfirmOptions,
  RunStep,
  LogStep,
  KeyOptions,
} from './types';
import { createLineTransformStream } from './utils/createLineTransformStream';
import { ExpectedError } from 'clime';

interface FraternalBeforeSetup<Values> {
  prompt<Key extends string>(
    key: Key,
    message: string,
    options?: PromptOptions<Values>
  ): FraternalBeforeSetup<
    {
      [K in keyof (Values & { [K in Key]: string })]: (Values & { [K in Key]: string })[K];
    }
  >;

  confirm<Key extends string>(
    key: Key,
    message: string,
    options?: ConfirmOptions<Values>
  ): FraternalBeforeSetup<
    {
      [K in keyof (Values & { [K in Key]: boolean })]: (Values & { [K in Key]: boolean })[K];
    }
  >;

  derive<Key extends string, Value>(
    key: Key,
    fn: (ctx: Context<Values>) => Value,
    options?: KeyOptions
  ): FraternalBeforeSetup<
    {
      [K in keyof (Values & { [K in Key]: Value })]: (Values & { [K in Key]: Value })[K];
    }
  >;

  action(cb: (context: Context<Values>) => void): FraternalBeforeSetup<Values>;

  log(message: string): FraternalBeforeSetup<Values>;
  log(cb: (context: Context<Values>) => string | Promise<string>): FraternalBeforeSetup<Values>;

  setupFiles(): FraternalAfterSetup<Values>;
}

interface FraternalAfterSetup<Values> {
  action(cb: (context: Context<Values>) => void): FraternalAfterSetup<Values>;

  log(message: string): FraternalAfterSetup<Values>;
  log(cb: (context: Context<Values>) => string | Promise<string>): FraternalAfterSetup<Values>;

  run(unix: string, win?: string): FraternalAfterSetup<Values>;
}

type FraternalCommands<Values> = FraternalAfterSetup<Values> & FraternalBeforeSetup<Values>;

export interface Fraternal<Values> extends FraternalCommands<Values> {
  _steps: Step[];
  _options: FraternalOptions;
  _values: Record<string, any>;
  _valueSearchTexts: Record<string, string>;
  _projectName: string;
  _hasBeenSetup: boolean;
  _projectPath: string;
  createContext(): Context<Values>;
  execute(cwd: string, templateDir: string): Promise<void>;
  executeSetupFiles(projectPath: string, templateDir: string): Promise<void>;
  executePromptStep({ key, default: def, question }: PromptStep): Promise<void>;
  executeDeriveStep({ key, fn }: DeriveStep): Promise<void>;
  executeActionStep({ fn }: ActionStep): Promise<void>;
  executeLogStep({ message }: LogStep): Promise<void>;
  executeRunStep({ unix, win }: RunStep): Promise<void>;
}

type FraternalFn<Return> = (options?: Partial<FraternalOptions>) => Return;

const Fraternal = function <Values extends object>(options?: Partial<FraternalOptions>): Fraternal<Values> {
  const _options: FraternalOptions = {
    getSearchText: (key) => `__${key}__`,
    ...options,
  };

  return {
    _options,
    _steps: [],
    _values: {},
    _valueSearchTexts: {},
    _projectName: '',
    _hasBeenSetup: false,
    _projectPath: '',

    prompt: function <Key extends string>(
      key: Key,
      message: string,
      options?: PromptOptions<Values>
    ): Fraternal<
      {
        [K in keyof (Values & { [K in Key]: string })]: (Values & { [K in Key]: string })[K];
      }
    > {
      this._steps.push({
        type: 'prompt',
        key,
        question: {
          type: 'input',
          message,
        },
        default: options?.default,
        keyOptions: options,
      });

      return this as Fraternal<
        {
          [K in keyof (Values & { [K in Key]: string })]: (Values & { [K in Key]: string })[K];
        }
      >;
    },

    confirm: function <Key extends string>(
      key: Key,
      message: string,
      options?: ConfirmOptions<Values>
    ): Fraternal<
      {
        [K in keyof (Values & { [K in Key]: boolean })]: (Values & { [K in Key]: boolean })[K];
      }
    > {
      this._steps.push({
        type: 'prompt',
        key,
        question: {
          type: 'confirm',
          message,
        },
        default: options?.default,
        keyOptions: options,
      });

      return this as Fraternal<
        {
          [K in keyof (Values & { [K in Key]: boolean })]: (Values & { [K in Key]: boolean })[K];
        }
      >;
    },

    derive: function <Key extends string, Value>(
      key: Key,
      fn: (ctx: Context<Values>) => Value,
      options?: KeyOptions
    ): Fraternal<
      {
        [K in keyof (Values & { [K in Key]: Value })]: (Values & { [K in Key]: Value })[K];
      }
    > {
      this._steps.push({
        type: 'derive',
        key,
        fn,
        keyOptions: options,
      });

      return this as Fraternal<
        {
          [K in keyof (Values & { [K in Key]: Value })]: (Values & { [K in Key]: Value })[K];
        }
      >;
    },

    action: function (fn: (context: Context<Values>) => void | Promise<void>): Fraternal<Values> {
      this._steps.push({
        type: 'action',
        fn,
      });

      return this;
    },

    log: function (message: string | ((context: Context<Values>) => string | Promise<string>)): Fraternal<Values> {
      this._steps.push({
        type: 'log',
        message,
      });

      return this;
    },

    run: function (unix: string, win = unix): FraternalAfterSetup<Values> {
      this._steps.push({
        type: 'run',
        unix,
        win,
      });

      return this;
    },

    setupFiles: function (): FraternalAfterSetup<Values> {
      this._steps.push({ type: 'setupFiles' });

      return this;
    },

    createContext(): Context<Values> {
      return {
        chalk,
        values: { ...this._values } as Values,
        projectName: this._projectName,
      };
    },

    execute: async function (cwd: string, templateDir: string): Promise<void> {
      const { projectName } = await inquirer.prompt({
        type: 'input',
        name: 'projectName',
        message: 'Project name',
      });

      this._projectName = projectName;
      this._valueSearchTexts.projectName = this._projectPath = path.join(cwd, this._projectName);

      for (const step of this._steps) {
        if (step.type === 'setupFiles') {
          await this.executeSetupFiles(this._projectPath, templateDir);
        } else if (step.type === 'prompt') {
          await this.executePromptStep(step);
        } else if (step.type === 'derive') {
          await this.executeDeriveStep(step);
        } else if (step.type === 'action') {
          await this.executeActionStep(step);
        } else if (step.type === 'log') {
          await this.executeLogStep(step);
        } else if (step.type === 'run') {
          await this.executeRunStep(step);
        }
      }

      if (!this._hasBeenSetup) await this.executeSetupFiles(this._projectPath, templateDir);
    },

    executeSetupFiles: async function (projectPath: string, templateDir: string): Promise<void> {
      const spinners = new Spinners();

      spinners.add('setupFiles', {
        text: 'Generating files',
      });

      const templateFilesPath = path.join(templateDir, 'template');

      const gitIgnoreContents = await fs
        .readFile(path.join(templateFilesPath, '.gitignore'), { encoding: 'utf-8' })
        .catch(() => '');

      const ignore = gitIgnore.compile(gitIgnoreContents);

      try {
        await walk(templateFilesPath, async (err, oldPath, dirent) => {
          if (err) throw err;

          if (dirent.isFile() && ignore.accepts(oldPath.replace(templateFilesPath + '/', ''))) {
            const newPath = oldPath.replace(templateFilesPath, projectPath);

            await fs.ensureDir(path.parse(newPath).dir);

            const readStream = fs.createReadStream(oldPath);
            const writeStream = fs.createWriteStream(newPath);
            const transformStream = createLineTransformStream((line) =>
              Object.entries(this._values).reduce(
                (acc, [key, value]) => acc.split(this._valueSearchTexts[key]).join(value.toString()),
                line
              )
            );

            readStream.pipe(transformStream).pipe(writeStream);

            await new Promise((resolve, reject) => {
              writeStream.on('finish', resolve);
              writeStream.on('error', reject);
            });
          }
        });
      } catch (err) {
        spinners.fail('setupFiles', {
          text: 'Failed to generate files',
        });

        throw new ExpectedError(err);
      }

      this._hasBeenSetup = true;

      spinners.succeed('setupFiles', {
        text: 'Generating files',
      });
    },

    executePromptStep: async function ({ key, ...step }: PromptStep): Promise<void> {
      let defaultValue: any;
      if (typeof step.default === 'function') {
        defaultValue = step.default(this.createContext());
      } else {
        defaultValue = step.default;
      }

      const answers = await inquirer.prompt({
        ...step.question,
        name: key,
        default: defaultValue,
      });

      this._values[key] = answers[key];
      this._valueSearchTexts[key] = step.keyOptions?.searchText ?? this._options.getSearchText(key);

      if (step.keyOptions?.transform) {
        this._values[key] = step.keyOptions.transform(this._values[key]);
      }
    },

    executeDeriveStep: async function ({ key, ...step }: DeriveStep): Promise<void> {
      this._values[key] = await step.fn(this.createContext());
      this._valueSearchTexts[key] = step.keyOptions?.searchText ?? this._options.getSearchText(key);

      if (step.keyOptions?.transform) {
        this._values[key] = step.keyOptions.transform(this._values[key]);
      }
    },

    executeActionStep: async function ({ fn }: ActionStep): Promise<void> {
      await fn(this.createContext());
    },

    executeLogStep: async function (step: LogStep): Promise<void> {
      let message: string;
      if (typeof step.message === 'string') {
        message = step.message;
      } else {
        message = await step.message(this.createContext());
      }

      console.log(`\n${message.trim()}\n`);
    },

    executeRunStep: async function ({ unix, win }: RunStep): Promise<void> {
      const spinners = new Spinners();

      const command = process.platform === 'win32' ? win : unix;

      spinners.add('run', {
        text: `Executing: ${command}`,
      });

      try {
        await new Promise<void>((resolve, reject) =>
          child.exec(command, { cwd: this._projectPath }, (err, stdout, stderr) => {
            if (err) reject(new Error(stderr));
            resolve();
          })
        );
      } catch (err) {
        spinners.remove('run');

        console.error(err);
        throw new ExpectedError(`Failed to execute: ${command}`);
      }

      spinners.succeed('run', { text: `Finished executing: ${command}` });
    },
  };
};

export const Config = Fraternal as unknown as FraternalFn<FraternalBeforeSetup<{}>>;
