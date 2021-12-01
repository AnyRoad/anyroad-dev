import * as GitHubTypes from './types';

export enum ApiCallResult {
  Success = 1,
  NotFound,
  Failed
}

const buildFailedResponse = async <DataType>(
  response: Response,
  defaultResult: DataType
): Promise<[ApiCallResult, string, DataType]> => {
  if (response.status === 404) {
    return [
      ApiCallResult.NotFound,
      'Target not found in GitHub, please check you input.',
      defaultResult
    ];
  }
  if (response.json) {
    const json = await response.json();
    if (json.message) {
      return [ApiCallResult.Failed, json.message as string, defaultResult];
    }
  }

  return [ApiCallResult.Failed, response.statusText, defaultResult];
};

const isReponseSuccess = (response: Response): boolean => {
  return response.ok && response.status === 200;
};

export class GitHubApi {
  getForks = async (
    author: string,
    repo: string,
    sort = 'stargazers',
    pageSize = 100
  ): Promise<[ApiCallResult, string, GitHubTypes.Repository[]]> => {
    const response = await fetch(
      `https://api.github.com/repos/${author}/${repo}/forks?sort=${sort}&per_page=${pageSize}`
    );

    if (!isReponseSuccess(response)) {
      return await buildFailedResponse<GitHubTypes.Repository[]>(response, []);
    }

    const json = await response.json();
    return [ApiCallResult.Success, '', json as GitHubTypes.Repository[]];
  };

  getRepo = async (
    author: string,
    repo: string
  ): Promise<[ApiCallResult, string, GitHubTypes.Repository | null]> => {
    const response = await fetch(`https://api.github.com/repos/${author}/${repo}`);
    if (!isReponseSuccess(response)) {
      return await buildFailedResponse<GitHubTypes.Repository | null>(response, null);
    }
    const json = await response.json();
    return [ApiCallResult.Success, '', json as GitHubTypes.Repository];
  };

  compare = async (
    author: string,
    repo: string,
    branch: string,
    authoToCompare: string,
    branchToCompare: string
  ): Promise<[ApiCallResult, string, GitHubTypes.ComapareResult | null]> => {
    const response = await fetch(
      `https://api.github.com/repos/${author}/${repo}/compare/${branch}...${authoToCompare}:${branchToCompare}`
    );
    if (!isReponseSuccess(response)) {
      return await buildFailedResponse<GitHubTypes.ComapareResult | null>(response, null);
    }
    const json = await response.json();
    return [ApiCallResult.Success, '', json as GitHubTypes.ComapareResult];
  };
}

export * as GitHubTypes from './types';
