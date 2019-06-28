/** Open PR's through the bitbucket API - Krishan Marco Madan 
 * ---
 *  Args:
 *  -- hostname: API hostname
 *  -- apiKey: User API Key
 *  -- projectKey: The project key in which to open the PR
 *  -- repositorySlug: The slug of the repository in which to open the PR (E.g. RAS)
 *  -- title: The Title of the PR
 *  -- description: The description of the PR
 *  -- fromBranch: The source branch of the PR
 *  -- toBranch: The destination branch of the PR 
 *  -- reviewers: Comma separated list of usernames to add as reviewers (E.g. 'username1,username2,username3')
  *  */
const _ = require('lodash');
const fetch = require('node-fetch');

async function openPr(args) {
  try {
    validateArgs(args);
    await requestOpenPr(args);

  } catch (err) {
    console.log(err);
  }
}

function validateArgs(args) {
  const requiredArgs = [
    'hostname',
    'apiKey',
    'projectKey',
    'repositorySlug',
    'title',
    // 'description',
    'fromBranch',
    'toBranch',
    // 'reviewers',
  ];
  
  const invalidArgs = _.filter(requiredArgs, x => {
    return _.isEmpty(args[x]) || !requiredArgs.includes(x);
  });
  
  if (invalidArgs.length <= 0) {
    return;
  }

  throw `ERR: Invalid arguments supplied, (${invalidArgs.join(', ')}) need to be specified.`;
}


async function requestOpenPr(args) {
  const {
    hostname,
    apiKey,
    projectKey,
    repositorySlug,
    title,
    description,
    fromBranch,
    toBranch,
    reviewers,
  } = args;

  function buildRef(branchName) {
    return {
      id: `refs/heads/${branchName}`,
      repository: {
        slug: repositorySlug,
        name: null,
        project: {
          key: projectKey
        }
      }
    };
  }

  function buildReviewer(username) {
    return {
      user: {
        name: username.toLowerCase()
      }
    };
  }

  const endpoint = `https://${hostname}/rest/api/1.0/projects/${projectKey}/repos/${repositorySlug}/pull-requests`;
  console.log(`Opening PR to ${endpoint}`, args);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      title,
      description,
      state: 'OPEN',
      open: true,
      closed: false,
      locked: false,
      fromRef: buildRef(fromBranch),
      toRef: buildRef(toBranch),
      reviewers: (!_.isEmpty(reviewers) ? reviewers : [])
          .split(',')
          .map(buildReviewer)
    }),
  });

  const result = await response.json();

  if (`${response.status}`[0] != '2') {
    throw `ERR: ${_.get(result, 'errors[0].message', `Unknown Error ${response.status}`)}`;
  }

  console.log(`SUCCESS: PR result to ${endpoint}`, result);

  return result;
}

module.exports = openPr;
