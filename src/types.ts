import { Chalk } from 'chalk';
import { DistinctQuestion } from 'inquirer';

export interface Context<Values> {
  chalk: Chalk;
  values: Values;
  projectName: string;
}

export interface KeyOptions {
  searchText?: string;
  transform?(input: string): string | Promise<string>;
}

export interface PromptOptions<Values> extends KeyOptions {
  default?: string | ((ctx: Context<Values>) => string);
}

export interface ConfirmOptions<Values> extends KeyOptions {
  default?: boolean | ((ctx: Context<Values>) => boolean);
}

export interface FraternalOptions {
  getSearchText: (key: string) => string;
}

export interface PromptStep {
  type: 'prompt';
  key: string;
  question: DistinctQuestion;
  default?: { toString(): string } | ((ctx: Context<any>) => { toString(): string });
  keyOptions?: KeyOptions;
}

export interface DeriveStep {
  type: 'derive';
  key: string;
  fn(ctx: Context<any>): unknown | Promise<unknown>;
  keyOptions?: KeyOptions;
}

export interface ActionStep {
  type: 'action';
  fn(ctx: Context<any>): void | Promise<void>;
}

export interface LogStep {
  type: 'log';
  message: string | ((ctx: Context<any>) => string | Promise<string>);
}

export interface RunStep {
  type: 'run';
  unix: string;
  win: string;
}

export interface SetupFilesStep {
  type: 'setupFiles';
}

export type Step = PromptStep | DeriveStep | ActionStep | LogStep | RunStep | SetupFilesStep;
