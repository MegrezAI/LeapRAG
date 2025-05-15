import chalk from 'chalk';
import util from 'util';

export const logger = {
  error(...args: any[]) {
    console.log(chalk.red(...formatArgs(args)));
  },
  warn(...args: any[]) {
    console.log(chalk.yellow(...formatArgs(args)));
  },
  info(...args: any[]) {
    console.log(chalk.cyan(...formatArgs(args)));
  },
  success(...args: any[]) {
    console.log(chalk.green(...formatArgs(args)));
  },
  break() {
    console.log('');
  }
};

function formatArgs(args: any[]) {
  return args.map((arg) =>
    typeof arg === 'string' ? arg : util.inspect(arg, { colors: true, depth: null })
  );
}
