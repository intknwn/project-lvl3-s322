import fs from 'mz/fs';
import url from 'url';
import path from 'path';
import cheerio from 'cheerio';
import axios from './lib/axios';

const makePath = (address, fileExt = '') => {
  const addr = address[0] === '/' ? address.slice(1) : address;
  const { host, pathname } = url.parse(addr, true);
  const { ext, dir, name } = path.parse([host, pathname].join(''));
  const base = (path.join(dir, name)).replace(/[^a-z0-9]/gi, '-');
  return `${base}${fileExt || ext || '.html'}`;
};

const parseHtml = (data, address) => {
  const $ = cheerio.load(data);
  const resFilePath = makePath(address, '_files');
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
        const resFileName = makePath(urlStr);
        const newUrl = `${resFilePath}/${resFileName}`;
        $(el).attr(tag.attr, newUrl);
      }
    });

    return acc;
  }, []);

  return { urls, newHtml: $.html() };
};

const getResource = (address, resUrl, output) => {
  const filePath = path.join(output, makePath(resUrl || address));
  return axios.get(address, { responseType: 'arraybuffer' })
    .catch((err) => {
      console.error(`HTML ${err.response.status}. Resource '${address}' can not be found.`);
      const newErr = new Error();
      newErr.code = err.response.status;
      throw newErr;
    })
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
  const resFilesPath = path.join(output, makePath(address, '_files'));
  let parsedData;

  return getResource(address, '', outputDir)
    .then(() => fs.readFile(filePath, 'utf8'))
    .then(data => parseHtml(data, address))
    .then((parsedObj) => {
      parsedData = parsedObj;
      return fs.writeFile(filePath, parsedObj.newHtml);
    })
    .then(() => fs.mkdir(resFilesPath))
    .then(() => Promise.all(parsedData.urls.map(urlStr => getResource(`${address}/${urlStr}`, urlStr, resFilesPath))))
    .then(() => fileName);
};
