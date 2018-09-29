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
        console.log(`Page '${address}' and resourses loaded successfully to '${program.output}'.`);
        process.exit();
      })
      .catch(() => {
        process.exit(1);
      });
  });

program.parse(process.argv);
