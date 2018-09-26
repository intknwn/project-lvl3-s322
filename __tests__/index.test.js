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
const fileData = fs.readFileSync(filePath, 'utf8');
const resources = [
  'img-hexlet.jpg',
  'js-main.js',
  'css-main.css',
];


describe('page-loader', () => {
  let output;

  beforeEach(() => {
    output = fs.mkdtempSync(tmpDir);

    nock.disableNetConnect();
    nock(host)
      .get('/courses')
      .reply(200, fileData);
    nock(host)
      .get('/courses/css/main.css')
      .replyWithFile(200, `${__dirname}/__fixtures__/boilerplate/css/main.css`);
    nock(host)
      .get('/courses/img/hexlet.jpg')
      .replyWithFile(200, `${__dirname}/__fixtures__/boilerplate/img/hexlet.jpg`);
    nock(host)
      .get('/courses/js/main.js')
      .replyWithFile(200, `${__dirname}/__fixtures__/boilerplate/js/main.js`);
  });

  // it('downloading page', async (done) => {
  //   try {
  //     const filePath = await loadPage(pageUrl, output);
  //     expect(fileName).toBe('hexlet-io-courses.html');
  //     const fileDir = `${output}${path.sep}${fileName}`;
  //     const data = await fs.readFile(fileDir, 'utf8');
  //     expect(data).toBe(fileData);
  //     done();
  //   } catch (err) {
  //     done.fail(err);
  //   }
  // });

  it('non-existent page', async (done) => {
    try {
      await loadPage(wrongUrl, output);
      done.fail();
    } catch (err) {
      expect(err.status).toBe(404);
      done();
    }
  });

  it('non-existent output directory', async (done) => {
    try {
      await loadPage(pageUrl, 'notexist');
      done.fail();
    } catch (err) {
      expect(err.code).toBe('ENOENT');
      done();
    }
  });

  it('downloading page and resources', async (done) => {
    try {
      const fileName = await loadPage(pageUrl, output);
      expect(fileName).toBe('hexlet-io-courses.html');
      const result1 = await fs.exists(path.resolve(output, fileName));
      expect(result1).toBe(true);
      const result2 = await resources.map(item => fs.exists(path.resolve(output, 'hexlet-io-courses_files', item)));
      expect(result2).not.toContain(false);
      done();
    } catch (err) {
      done.fail(err);
    }
  });
});
