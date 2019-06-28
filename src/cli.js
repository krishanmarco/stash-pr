const _ = require('lodash');
const minimist = require('minimist');
const openPr = require('./open-pr.js');
const {getGitHostname, getGitProjectKey, getGitRepositorySlug, getGitCurrentBranch} = require('./git.js');
const readline = require('readline');
const {ExternalEditor} = require('external-editor');

async function getLine(info, defaultValue) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const defaultStr = !_.isEmpty(defaultValue) ? ` [default: ${defaultValue}]` : '';
  const result = await new Promise(resolve => rl.question(`${info}${defaultStr}: `, resolve))
    .finally(() => rl.close());

  return !_.isEmpty(result)
    ? result
    : defaultValue;
}

async function getEditorInput(info) {
  console.log(`${info}: `);

  return new Promise((resolve, reject) => {
    const editor = new ExternalEditor();
    try {
      resolve(editor.run());
    } catch (err) {
      reject(err);
    } finally {
      editor.cleanup();
    }
  });
}

async function getLines(info) {
  console.log(`${info}: `);

  const buf = [];
  process.stdin.setEncoding('utf8');
  return new Promise((resolve, reject) => {
      process.stdin.on('data', (val) => {
      if (val == '\n' || val == '\r\n') {
        process.stdin.removeAllListeners('data');
        return resolve(buf.join('\n'));
      }
      buf.push(val.trimRight());
    }).resume();
  });
}

function getArgInput(info, defaultValueGetter) {
  return async (previousArgs) => {
    const defaultValue = _.isFunction(defaultValueGetter)
        ? await defaultValueGetter()
        : null
    return getLine(info, defaultValue);
  };
}

function getMultilineInput(info) {
  return async (previousArgs) => {
    let input = '';

    // Try get editor input
    try {
      input = await getEditorInput(info);
    } catch (e) {
      // Fallback to terminal input
      input = await getLines(info);
    }
    
    return input;
  }
}

function getListInput(info) {
  return async (previousArgs) => {
    const arr = [];

    while (true) {
      const line = await getLine(`${info} [${arr.join(',')}]`);
      if (_.isEmpty(line)) {
        break;
      }
      arr.push(line);
    }

    return arr.join(',');
  };
}

const cliArgs = [
  {
    name: 'hostname',
    get: getArgInput(
      '[Required] Insert the stash server {{hostname}}', 
      getGitHostname
    ),
  },
  {
    name: 'apiKey',
    get: getArgInput('[Required] Insert the stash server {{apiKey}}'),
  },
  {
    name: 'projectKey',
    get: getArgInput(
      '[Required] Insert the {{projectKey}}', 
      getGitProjectKey
    ),
  },
  {
    name: 'repositorySlug',
    get: getArgInput(
      '[Required] Insert the {{repositorySlug}}', 
      getGitRepositorySlug
    ),
  },
  {
    name: 'title',
    get: getArgInput('[Required] Insert the PR {{title}}'),
  },
  {
    name: 'description',
    get: getMultilineInput('[Optional] Insert eh PR {{description}}'),
  },
  {
    name: 'fromBranch',
    get: getArgInput(
      '[Required] Insert the PR source {{fromBranch}}', 
      getGitCurrentBranch
    ),
  },
  {
    name: 'toBranch',
    get: getArgInput('[Required] Insert the PR destination {{toBranch}}'),
  },
  {
    name: 'reviewers',
    get: getListInput('[Optional] Insert the PR {{reviewers}}'),
  },
];

async function run(args) {
  // Find the args that were not specified
  const setArgs = Object.keys(args);
  const missingArgs = cliArgs.filter(({name}) => !setArgs.includes(name));
  
  // Request missingArgs
  await missingArgs.reduce(async (previousPromise, {name, get}) => {
    await previousPromise;
    
    const value = await get(args);
    if (_.isEmpty(value)) {
      return;
    }
    
    args[name] = value;
  }, Promise.resolve());

  await openPr(args);
}

(async () => {
  const argv = minimist(process.argv.slice(2));
  await run(argv);
})();

