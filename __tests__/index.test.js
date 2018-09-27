import os from 'os';
import fs from 'mz/fs';
import nock from 'nock';
import path from 'path';
import loadPage from '../src/';

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

  beforeEach(() => {
    output = fs.mkdtempSync(tmpDir);
    nock.disableNetConnect();

    nock(host)
      .get('/courses')
      .reply(200, fileData)
      .get('/courses/css/main.css')
      .replyWithFile(200, `${__dirname}/__fixtures__/boilerplate/css/main.css`)
      .get('/courses/img/hexlet.jpg')
      .replyWithFile(200, `${__dirname}/__fixtures__/boilerplate/img/hexlet.jpg`)
      .get('/courses/js/main.js')
      .replyWithFile(200, `${__dirname}/__fixtures__/boilerplate/js/main.js`);
  });

  it('non-existent page', async () => {
    try {
      await loadPage(wrongUrl, output);
    } catch (err) {
      expect(err.status).toBe(404);
    }
  });

  it('non-existent output directory', async () => {
    try {
      await loadPage(pageUrl, 'notexist');
    } catch (err) {
      expect(err.code).toBe('ENOENT');
    }
  });

  it('downloading page and resources', async () => {
    const fileName = await loadPage(pageUrl, output);
    expect(fileName).toBe('hexlet-io-courses.html');
    const fileExists = await fs.exists(path.resolve(output, fileName));
    expect(fileExists).toBe(true);
    const data = await fs.readFile(path.resolve(output, fileName), 'utf8');
    expect(data).toBe(newFileData);
    const resExist = await resources.map(item => fs.exists(path.resolve(output, 'hexlet-io-courses_files', item)));
    expect(resExist).not.toContain(false);
  });
});
