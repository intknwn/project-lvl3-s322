import fs from 'mz/fs';
import url from 'url';
import path from 'path';
import axios from './lib/axios';

export default (address, output) => {
  const { hostname, pathname } = url.parse(address);
  const fileName = `${`${hostname}${pathname}`.replace(/[^a-z0-9]/gi, '-')}.html`;

  return axios.get(address)
    .then(res => fs.writeFile(path.join(output, fileName), res.data, 'utf8'))
    .then(() => {
      console.log(`Page successfully downloaded: ${path.join(output, fileName)}`);
      return fileName;
    })
    .catch((err) => {
      if (err.code === 'ENOENT') {
        console.error(`Directory '${output}' does not exist. Please, create it first and try again.`);
      }
      throw err;
    });
};
