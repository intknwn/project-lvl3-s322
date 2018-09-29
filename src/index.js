import fs from 'mz/fs';
import url from 'url';
import path from 'path';
import debug from 'debug';
import cheerio from 'cheerio';
import axios from './lib/axios';

const loadLog = debug('page-loader:load');
const parsedUrlsLog = debug('page-loader:parse');
const newUrlsLog = debug('page-loader:makeurl');

export const makePath = (address, fileExt = '') => {
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
        newUrlsLog(newUrl);
        $(el).attr(tag.attr, newUrl);
      }
    });

    return acc;
  }, []);

  return { urls, newHtml: $.html() };
};

const makeError = (err, output, address) => {
  const { config, code, path: errPath } = err;
  if (config) {
    const message = `Error ${code || err.response.status}. Resource '${address}' can not be accessed.`;
    throw new Error(message);
  }
  if (code === 'ENOENT') {
    const message = `Oops! Output directory '${output}' does not exist. Please, create it first and try again.`;
    console.error(message);
    throw new Error(message);
  }
  if (code === 'EEXIST') {
    const message = `Oops! File '${errPath}' already exists.`;
    console.error(message);
    throw new Error(message);
  }
  if (errPath) {
    const message = `Error '${code}'. Check the path and permissions for '${errPath}'`;
    throw new Error(message);
  }
  console.error(err);
  return Promise.reject(err);
};

const getResource = (address, resUrl, output) => {
  const filePath = path.join(output, makePath(resUrl || address));
  return axios.get(address, { responseType: 'arraybuffer' })
    .then(res => fs.writeFile(filePath, res.data, 'utf8'))
    .then(() => {
      loadLog(`File loaded: ${filePath}`);
      console.log(`Resource successfully downloaded: ${filePath}`);
      return filePath;
    });
};

export default (address, output) => {
  const fileName = makePath(address);
  const filePath = path.join(output, fileName);
  const resFilesPath = path.join(output, makePath(address, '_files'));
  let parsedData;

  return fs.mkdir(resFilesPath)
    .then(() => getResource(address, '', output))
    .then(() => fs.readFile(filePath, 'utf8'))
    .then(data => parseHtml(data, address))
    .then((parsedObj) => {
      parsedData = parsedObj;
      parsedUrlsLog(parsedObj.urls);
      return fs.writeFile(filePath, parsedObj.newHtml);
    })
    .then(() => Promise.all(parsedData.urls.map(urlStr => getResource(`${address}/${urlStr}`, urlStr, resFilesPath))))
    .catch(err => makeError(err, output, address));
};
