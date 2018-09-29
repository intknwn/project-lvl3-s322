import fs from 'mz/fs';
import url from 'url';
import path from 'path';
import Listr from 'listr';
import debug from 'debug';
import cheerio from 'cheerio';
import axios from './lib/axios';
import makeError from './lib/errors';

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

const getResource = (address, resUrl, output) => {
  const filePath = path.join(output, makePath(resUrl || address));
  return axios.get(address, { responseType: 'arraybuffer' })
    .then(res => fs.writeFile(filePath, res.data, 'utf8'))
    .then(() => {
      loadLog(`File loaded: ${filePath}`);
    });
};

export default (address, output) => {
  const fileName = makePath(address);
  const filePath = path.join(output, fileName);
  const resFilesPath = path.join(output, makePath(address, '_files'));
  let parsedData;

  const tasks = new Listr([
    {
      title: 'Creating resourses directory',
      task: () => fs.mkdir(resFilesPath)
        .catch(err => Promise.reject(makeError(err, output, address))),
    },
    {
      title: 'Saving page',
      task: () => getResource(address, '', output)
        .catch(err => Promise.reject(makeError(err, output, address))),
    },
    {
      title: 'Parsing file',
      task: () => fs.readFile(filePath, 'utf8')
        .then(data => parseHtml(data, address))
        .then((parsedObj) => {
          parsedData = parsedObj;
          parsedUrlsLog(parsedObj.urls);
          return fs.writeFile(filePath, parsedObj.newHtml);
        })
        .catch(err => Promise.reject(makeError(err, output, address))),
    },
    {
      title: 'Saving resourses',
      task: () => new Listr(parsedData.urls.map((urlStr) => {
        const res = `${address}/${urlStr}`;
        return {
          title: `  ${res} -> ${resFilesPath}`,
          task: () => getResource(res, urlStr, resFilesPath)
            .catch(err => Promise.reject(makeError(err, output, address))),
        };
      }), { concurrent: true }),
    },
  ]);

  return tasks.run()
    .catch(err => Promise.reject(err));

};
