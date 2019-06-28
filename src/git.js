const _ = require('lodash');
const parseGitConfig = require('parse-git-config');
const branch = require('git-branch');

const parsedConfig = parseGitConfig.sync();

const url = _.get(parsedConfig, 'remote \"origin\".url', '');
const parsedUrl = url
  .match(/ssh:\/\/git@(.*):.*\/(.*)\/(.*)\./);

const hostname = _.get(parsedUrl, '[1]');
const projectKey = _.get(parsedUrl, '[2]');
const repositorySlug = _.get(parsedUrl, '[3]');

async function getGitHostname() {
  return !_.isEmpty(hostname)
    ? Promise.resolve(hostname)
    : Promise.reject();
}

async function getGitProjectKey() {
  return !_.isEmpty(projectKey)
    ? Promise.resolve(projectKey)
    : Promise.reject();
}

async function getGitRepositorySlug() {
  return !_.isEmpty(repositorySlug)
    ? Promise.resolve(repositorySlug)
    : Promise.reject();
}

async function getGitCurrentBranch() {
  return new Promise((resolve, reject) => {
    branch((err, name) => {
      return err == null
        ? resolve(name)
        : reject(err)
    });
  });
}

module.exports = {
  getGitHostname,
  getGitProjectKey,
  getGitRepositorySlug,
  getGitCurrentBranch,
};
