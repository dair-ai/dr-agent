import Exa from 'exa-js';

const getExaClient = () => {
  if (!process.env.EXA_API_KEY) {
    throw new Error('EXA_API_KEY environment variable is required');
  }
  return new Exa(process.env.EXA_API_KEY);
};

export interface SearchParams {
  query: string;
  type?: 'neural' | 'keyword';
  numResults?: number;
  includeDomains?: string[];
  excludeDomains?: string[];
  startPublishedDate?: string;
  endPublishedDate?: string;
}

export interface SearchResult {
  id: string;
  title: string;
  url: string;
  publishedDate?: string;
  author?: string;
  score?: number;
}

export interface GetContentsParams {
  urls: string[];
  maxCharacters?: number;
}

export interface ContentResult {
  url: string;
  title: string;
  text: string;
  publishedDate?: string;
  author?: string;
}

/**
 * Search the web using Exa's neural or keyword search
 */
export async function searchWeb(params: SearchParams): Promise<{
  success: boolean;
  results?: SearchResult[];
  error?: string;
}> {
  try {
    const exa = getExaClient();
    const results = await exa.search(params.query, {
      type: params.type || 'neural',
      numResults: params.numResults || 5,
      includeDomains: params.includeDomains,
      excludeDomains: params.excludeDomains,
      startPublishedDate: params.startPublishedDate,
      endPublishedDate: params.endPublishedDate,
      useAutoprompt: params.type === 'neural',
    });

    return {
      success: true,
      results: results.results.map((r) => ({
        id: r.id,
        title: r.title || 'Untitled',
        url: r.url,
        publishedDate: r.publishedDate,
        author: r.author,
        score: r.score,
      })),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Search failed',
    };
  }
}

/**
 * Fetch full text content from URLs
 */
export async function getContents(params: GetContentsParams): Promise<{
  success: boolean;
  contents?: ContentResult[];
  error?: string;
}> {
  try {
    const exa = getExaClient();
    const results = await exa.getContents(params.urls, {
      text: {
        maxCharacters: params.maxCharacters || 10000,
      },
    });

    return {
      success: true,
      contents: results.results.map((r) => ({
        url: r.url,
        title: r.title || 'Untitled',
        text: r.text || '',
        publishedDate: r.publishedDate,
        author: r.author,
      })),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch contents',
    };
  }
}

/**
 * Find web pages similar to a given URL
 */
export async function findSimilar(
  url: string,
  numResults: number = 5,
  includeDomains?: string[],
  excludeDomains?: string[]
): Promise<{
  success: boolean;
  results?: SearchResult[];
  error?: string;
}> {
  try {
    const exa = getExaClient();
    const results = await exa.findSimilar(url, {
      numResults,
      includeDomains,
      excludeDomains,
    });

    return {
      success: true,
      results: results.results.map((r) => ({
        id: r.id,
        title: r.title || 'Untitled',
        url: r.url,
        publishedDate: r.publishedDate,
        author: r.author,
        score: r.score,
      })),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Find similar failed',
    };
  }
}
