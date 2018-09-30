#!/usr/bin/env node

import program from 'commander';
import loadPage from '..';

program
  .version('1.0.0')
  .arguments('<address>')
  .description('Downloads a web page with resourses to the specified directory.')
  .option('-o, --output [dir]', 'output directory')
  .action((address) => {
    loadPage(address, program.output)
      .then(() => {
        console.log(
          '\x1b[32m', 'Page',
          '\x1b[33m', `${address}`,
          '\x1b[32m', 'and resourses have been loaded successfully to',
          '\x1b[33m', `${program.output}`,
        );
        process.exit();
      })
      .catch(() => {
        console.error('\x1b[31m', 'Something went wrong. Exiting...');
        process.exit(1);
      });
  });

program.parse(process.argv);
