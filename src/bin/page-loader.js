#!/usr/bin/env node

import program from 'commander';
import loadPage from '..';

program
  .version('1.0.0')
  .arguments('<address>')
  .description('Downloads a web page to the specified directory.')
  .option('-o, --output [dir]', 'output directory')
  .action((address) => {
    console.log(loadPage(address, program.output));
  });

program.parse(process.argv);
