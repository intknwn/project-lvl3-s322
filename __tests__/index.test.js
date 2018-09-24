import os from 'os';
import fs from 'mz/fs';
import nock from 'nock';
import path from 'path';
import loadPage from '../src/';

const host = 'http://hexlet.io';
const tmpDir = `${os.tmpdir()}${path.sep}`;
const pageUrl = `${host}/courses`;
const wrongUrl = `${host}/wrong`;
const filePath = `${__dirname}/__fixtures__/page.html`;
const fileData = fs.readFileSync(filePath, 'utf8');


describe('page-loader', () => {
  let output;

  beforeEach(() => {
    output = fs.mkdtempSync(tmpDir);

    nock.disableNetConnect();
    nock(host)
      .get('/courses')
      .reply(200, fileData);
  });

  it('downloading page', async (done) => {
    try {
      const fileName = await loadPage(pageUrl, output);
      expect(fileName).toBe('hexlet-io-courses.html');
      const fileDir = `${output}${path.sep}${fileName}`;
      const data = await fs.readFile(fileDir, 'utf8');
      expect(data).toBe(fileData);
      done();
    } catch (err) {
      done.fail(err);
    }
  });

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
});
