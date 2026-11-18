// Retry transient Windows directory-creation sharing violations. Never change
// file permissions or suppress an error when the directory cannot be created.
if (process.platform === 'win32') {
  const fs = require('node:fs');
  const mkdir = fs.mkdir;
  fs.mkdir = function (...args) {
    const callback = args.pop();
    let attempts = 0;
    const run = () => mkdir.call(fs, ...args, (error, result) => {
      if (error?.code === 'EPERM') {
        try {
          if (fs.statSync(args[0]).isDirectory()) {
            if (args[1]?.recursive) return callback(null, undefined);
            const exists = new Error('Directory already exists');
            exists.code = 'EEXIST';
            exists.path = args[0];
            return callback(exists);
          }
        } catch {}
        if (++attempts < 6) return setTimeout(run, attempts * 100);
      }
      callback(error, result);
    });
    run();
  };
  const mkdirPromise = fs.promises.mkdir;
  fs.promises.mkdir = async function mkdirWithRetry(...args) {
    for (let attempt = 0; ; attempt++) {
      try { return await mkdirPromise.apply(fs.promises, args); }
      catch (error) {
        if (error.code !== 'EPERM') throw error;
        try {
          if (fs.statSync(args[0]).isDirectory()) {
            if (args[1]?.recursive) return undefined;
            const exists = new Error('Directory already exists');
            exists.code = 'EEXIST'; exists.path = args[0]; throw exists;
          }
        } catch (statError) { if (statError.code === 'EEXIST') throw statError; }
        if (attempt >= 5) throw error;
        await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 100));
      }
    }
  };
  require('node:module').syncBuiltinESMExports();
}
