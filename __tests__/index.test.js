import os from 'os';
import fs from 'mz/fs';
import nock from 'nock';
import path from 'path';
import { promises as fsp } from 'fs';
import loadPage, { makePath } from '../src/';

const host = 'http://hexlet.io';
const tmpDir = `${os.tmpdir()}${path.sep}`;
const pageUrl = `${host}/courses`;
const wrongUrl = `${host}/wrong`;
const filePath = `${__dirname}/__fixtures__/boilerplate/index.html`;
const newFilePath = `${__dirname}/__fixtures__/boilerplate/index2.html`;

const resources = [
  'img-hexlet.jpg',
  'js-main.js',
  'css-main.css',
];

describe('page-loader', () => {
  let output;
  const fileData = fs.readFileSync(filePath, 'utf8');
  const newFileData = fs.readFileSync(newFilePath, 'utf8');

  beforeEach(async () => {
    output = await fsp.mkdtemp(tmpDir);
    nock.disableNetConnect();

    nock(host)
      .get('/courses')
      .reply(200, fileData)
      .get('/courses/css/main.css')
      .replyWithFile(200, `${__dirname}/__fixtures__/boilerplate/css/main.css`)
      .get('/courses/img/hexlet.jpg')
      .replyWithFile(200, `${__dirname}/__fixtures__/boilerplate/img/hexlet.jpg`)
      .get('/courses/js/main.js')
      .replyWithFile(200, `${__dirname}/__fixtures__/boilerplate/js/main.js`)
      .get('/wrong')
      .reply(404);
  });

  it('incorrect url', async () => {
    const expectedErr = new Error('Error 404. Resource \'http://hexlet.io/wrong\' can not be accessed.');
    await expect(loadPage(wrongUrl, output)).rejects.toEqual(expectedErr);
  });

  it('non-existent output directory', async () => {
    const dir = 'notexist';
    const expectedErr = new Error(`Oops! Output directory '${dir}' does not exist. Please, create it first and try again.`);

    await expect(loadPage(pageUrl, dir)).rejects.toEqual(expectedErr);
  });

  it('file in output directory already exists', async () => {
    const srcDir = path.resolve(output, makePath(pageUrl, '_files'));
    await fs.mkdir(srcDir);
    const expectedErr = new Error(`Oops! File '${srcDir}' already exists.`);
    await expect(loadPage(pageUrl, output)).rejects.toEqual(expectedErr);
  });


  it('downloading page and resources', async () => {
    await loadPage(pageUrl, output);
    const fileName = makePath(pageUrl);
    expect(fileName).toBe('hexlet-io-courses.html');
    const fileExists = await fs.exists(path.resolve(output, fileName));
    expect(fileExists).toBe(true);
    const data = await fs.readFile(path.resolve(output, fileName), 'utf8');
    expect(data).toBe(newFileData);
    const resExist = await resources.map(item => fs.exists(path.resolve(output, 'hexlet-io-courses_files', item)));
    expect(resExist).not.toContain(false);
  });
});
