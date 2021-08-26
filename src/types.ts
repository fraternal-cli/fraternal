import { Chalk } from 'chalk';
import { DistinctQuestion } from 'inquirer';

export type DefaultValues = object & {
  projectName: string;
};

export interface Context<Values> {
  chalk: Chalk;
  values: Values;
}

export interface PromptOptions<Values> {
  default?: string | ((ctx: Context<Values>) => string);
}

export interface ConfirmOptions<Values> {
  default?: boolean | ((ctx: Context<Values>) => boolean);
}

export interface FraternalOptions {
  getSearchText(key: string): string;
}

export interface PromptStep {
  type: 'prompt';
  key: string;
  default?: { toString(): string } | ((ctx: Context<any>) => { toString(): string });
  question: DistinctQuestion;
}

export interface DeriveStep {
  type: 'derive';
  key: string;
  fn(ctx: Context<any>): unknown | Promise<unknown>;
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
