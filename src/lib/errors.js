export default (err, output, address) => {
  const { config, path: errPath } = err;
  const errCode = err.response ? err.response.status : err.code;

  const messages = {
    ENOENT: `Oops! Output directory '${output}' does not exist. Please, create it first and try again.`,
    EEXIST: `Oops! File '${errPath}' already exists.`,
    404: `HTTP 404. Resource '${address}' can not be found. Check the correctness of URL.`,
  };

  const errMsg = messages[errCode];

  if (errMsg) {
    return Promise.reject(new Error(errMsg));
  }

  if (config) {
    const message = `Error ${errCode}. Resource '${address}' can not be accessed.`;
    return Promise.reject(new Error(message));
  }

  if (errPath) {
    const message = `Error '${errCode}'. Check the path and permissions for '${errPath}'`;
    return Promise.reject(new Error(message));
  }

  return Promise.reject(new Error('Unknown error'));
};
