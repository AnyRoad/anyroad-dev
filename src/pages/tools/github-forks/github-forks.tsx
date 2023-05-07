import * as React from 'react';
import dayjs from 'dayjs';
import * as GitHubApis from '../../../api/github';
import classNames from 'classnames/bind';
import githubForkStyles from './github-forks.module.css';

const cx = classNames.bind(githubForkStyles);

import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

type RepositoryRowProps = {
  repository: GitHubApis.GitHubTypes.Repository;
  mainRepo: boolean;
};

function formatNumber(num: number): string {
  return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1 ');
}

const githubApi = new GitHubApis.GitHubApi();

const RepositoryRow = ({ repository, mainRepo = false }: RepositoryRowProps): JSX.Element => {
  return (
    <tr className={cx({ 'main-repo': mainRepo })}>
      <td>
        <img className={cx('avatar-image')} src={repository.owner.avatar_url} />
        <span>{repository.owner.login}</span>
      </td>
      <td>
        <a target='_blank' rel='noreferrer' href={repository.svn_url}>
          {repository.name}
        </a>
      </td>
      <td className={cx('center')}>{repository.default_branch}</td>
      <td className={cx('center')}>{repository.stargazers_count}</td>
      <td className={cx('center')}>{repository.forks_count}</td>
      <td className={cx('center')}>{repository.open_issues_count}</td>
      <td className={cx('right')}>{formatNumber(repository.size)}</td>
      <td className={cx('right')}>{dayjs(repository.pushed_at, 'YYYY-MM-DDTHH:mm:ssZ').fromNow()}</td>
      <td className={cx('right')}>{dayjs(repository.created_at, 'YYYY-MM-DDTHH:mm:ssZ').fromNow()}</td>
    </tr>
  );
};

const Forks = (): JSX.Element => {
  const [forks, setData] = React.useState([] as GitHubApis.GitHubTypes.Repository[]);
  const [originalRepo, setOriginalRepo] = React.useState(null as GitHubApis.GitHubTypes.Repository | null);
  const [errorText, setErrorText] = React.useState('');
  const [targetRepo, setTargetRepo] = React.useState('');
  const [sortingField, setSortingField] = React.useState('stargazers');

  const findForks = async () => {
    const [author, repo] = targetRepo.split('/');
    if (!author || !repo) {
      setErrorText('Please input repository in format "author/repository".');
      return;
    }
    const [originalApiResult, error, originalRepoInfo] = await githubApi.getRepo(author, repo);
    if (originalApiResult != GitHubApis.ApiCallResult.Success) {
      setErrorText(error);
      return;
    }
    setOriginalRepo(originalRepoInfo);

    const [forksApiResult, forksError, forksInfo] = await githubApi.getForks(author, repo, sortingField, 100);

    if (forksApiResult != GitHubApis.ApiCallResult.Success) {
      setErrorText(forksError);
      return;
    }
    setData(forksInfo);
    setErrorText('');
  };

  const onRepositoryKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      findForks();
    }
  };

  return (
    <>
      <div className='md:grid-cols-2 grid grid-cols-1 gap-4'>
        <div>
          <label htmlFor='repository' className={cx('label')}>
            Repository
          </label>
          <input
            id='repository'
            className={cx('repo-input')}
            value={targetRepo}
            onChange={(e) => setTargetRepo(e.target.value)}
            onKeyDown={onRepositoryKeyDown}
          />
        </div>
        <div>
          <label htmlFor='sorting' className={cx('label')}>
            Sort by
          </label>

          <select
            id='sorting'
            className={cx('sort-selector')}
            onChange={(e) => setSortingField(e.target.value)}
          >
            <option value='stargazers'>More stars</option>
            <option value='newest'>Newly created</option>
            <option value='oldest'>Oldiest</option>
          </select>
        </div>
      </div>
      <div>
        <button className={cx('button')} onClick={findForks}>
          Find Forks
        </button>
      </div>
      {errorText && errorText.length > 0 && <div className={cx('error-label')}>{errorText}</div>}
      <div className='flex'>
        <table className={cx('forks-table')}>
          <thead>
            <tr>
              <th>User</th>
              <th>Repository</th>
              <th>Default Branch</th>
              <th>Stars</th>
              <th>Forks</th>
              <th>Open Issues</th>
              <th>Size</th>
              <th>Pushed at</th>
              <th>Created at</th>
            </tr>
          </thead>
          <tbody>
            {originalRepo && <RepositoryRow repository={originalRepo} mainRepo />}
            {forks.map((repo: GitHubApis.GitHubTypes.Repository) => (
              <RepositoryRow key={repo.full_name} repository={repo} mainRepo={false} />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default Forks;
