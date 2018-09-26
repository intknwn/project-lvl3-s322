import fs from 'mz/fs';
import url from 'url';
import path from 'path';
import cheerio from 'cheerio';
import axios from './lib/axios';

const makePath = (address, ext = '') => {
  const { host, pathname } = url.parse(address);
  const fileExt = !pathname ? '' : path.extname(pathname);
  const newHost = !host ? '' : host.replace(/[^a-z0-9]/gi, '-');
  const newPath = !pathname ? '' : pathname
    .slice(0, fileExt ? -fileExt.length : pathname.length)
    .split('/')
    .filter(x => x)
    .join('-');

  const sep = newHost ? '-' : '';

  return `${newHost}${sep}${newPath}${ext || fileExt || '.html'}`;
};

const parseHtml = (data, address) => {
  const $ = cheerio.load(data);
  const tags = [
    { name: 'link', attr: 'href' },
    { name: 'script', attr: 'src' },
    { name: 'img', attr: 'src' },
  ];

  const urls = tags.reduce((acc, tag) => {
    $(tag.name).each((i, el) => {
      const urlStr = $(el).attr(tag.attr);
      if (!urlStr) {
        return;
      }
      const { host } = url.parse(urlStr);
      if (!host) {
        acc.push(urlStr);
        const newUrl = `${makePath(address, '_files')}/${makePath(urlStr)}`;
        $(el).attr(tag.attr, newUrl);
      }
    });

    return acc;
  }, []);

  return { urls, newHtml: $.html() };
};

const getResource = (address, output) => {
  const filePath = path.join(output, makePath(address));
  return axios.get(address, { responseType: 'arraybuffer' })
    .then(res => fs.writeFile(filePath, res.data, 'utf8'))
    .then(() => {
      console.log(`Resource successfully downloaded: ${filePath}`);
      return filePath;
    })
    .catch((err) => {
      if (err.code === 'ENOENT') {
        console.error(`Directory '${output}' does not exist. Please, create it first and try again.`);
      }
      throw err;
    });
};

export default (address, output) => {
  const outputDir = output;
  const fileName = makePath(address);
  const filePath = path.join(output, fileName);
  const resFilePath = path.join(output, makePath(address, '_files'));
  let parsedData;

  return getResource(address, outputDir)
    .then(() => fs.readFile(filePath, 'utf8'))
    .then(data => parseHtml(data, address))
    .then((parsedObj) => {
      parsedData = parsedObj;
      return fs.writeFile(filePath, parsedObj.newHtml);
    })
    .then(() => fs.mkdir(resFilePath))
    .then(() => Promise.all(parsedData.urls.map(urlStr => getResource(`${address}/${urlStr}`, resFilePath))))
    .then(() => fileName);
};
