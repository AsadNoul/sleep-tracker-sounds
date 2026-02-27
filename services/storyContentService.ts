import AsyncStorage from '@react-native-async-storage/async-storage';

interface LibriVoxSection {
  title?: string;
  listen_url?: string;
  playtime?: string;
}

interface LibriVoxGenre {
  name?: string;
}

interface LibriVoxBook {
  id?: string;
  title?: string;
  description?: string;
  language?: string;
  sections?: LibriVoxSection[];
  genres?: LibriVoxGenre[];
  totaltimesecs?: string;
}

interface LibriVoxResponse {
  books?: LibriVoxBook[];
}

export interface PublicStoryItem {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  uri: string;
  image: string;
}

export type PublicStoriesSource = 'cache' | 'network' | 'cache-stale' | 'fallback';

export interface PublicStoriesResult {
  stories: PublicStoryItem[];
  lastUpdated: number | null;
  source: PublicStoriesSource;
}

const STORY_IMAGES = [
  'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&q=80',
  'https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=400&q=80',
  'https://images.unsplash.com/photo-1559825481-12a05cc00344?w=400&q=80',
  'https://images.unsplash.com/photo-1534794048419-b5b9daee8975?w=400&q=80',
  'https://images.unsplash.com/photo-1476611317561-60117649dd94?w=400&q=80',
  'https://images.unsplash.com/photo-1452570053594-1b985d6ea890?w=400&q=80',
];

const FALLBACK_PUBLIC_STORIES: PublicStoryItem[] = [
  {
    id: 'public-story-gutenberg-23965-1',
    title: 'The Legend of Sleepy Hollow — Part 1',
    description: 'Public-domain narrated story from Project Gutenberg.',
    durationMinutes: 20,
    uri: 'https://www.gutenberg.org/files/23965/mp3/23965-01.mp3',
    image: STORY_IMAGES[0],
  },
  {
    id: 'public-story-gutenberg-23965-2',
    title: 'The Legend of Sleepy Hollow — Part 2',
    description: 'Public-domain narrated story from Project Gutenberg.',
    durationMinutes: 20,
    uri: 'https://www.gutenberg.org/files/23965/mp3/23965-02.mp3',
    image: STORY_IMAGES[1],
  },
  {
    id: 'public-story-gutenberg-23965-3',
    title: 'The Legend of Sleepy Hollow — Part 3',
    description: 'Public-domain narrated story from Project Gutenberg.',
    durationMinutes: 20,
    uri: 'https://www.gutenberg.org/files/23965/mp3/23965-03.mp3',
    image: STORY_IMAGES[2],
  },
];

const STORY_KEYWORDS = [
  'story',
  'stories',
  'fairy',
  'tale',
  'folklore',
  'myth',
  'children',
  'bedtime',
  'nursery',
  'dream',
  'sleep',
];

const LIST_ENDPOINTS = [
  'https://librivox.org/api/feed/audiobooks/?extended=1&format=json&limit=60&offset=0',
  'https://librivox.org/api/feed/audiobooks/?extended=1&format=json&limit=60&offset=60',
];

const CACHE_KEY = '@public_story_cache_v1';
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;

interface StoryCachePayload {
  savedAt: number;
  stories: PublicStoryItem[];
}

const stripHtml = (value?: string) => {
  if (!value) return '';
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
};

const getPrimaryPlayableSection = (sections?: LibriVoxSection[]) => {
  if (!sections || sections.length === 0) return null;
  const playable = sections.find((section) =>
    typeof section.listen_url === 'string' && /^https?:\/\//i.test(section.listen_url)
  );
  return playable ?? null;
};

const getStoryScore = (book: LibriVoxBook): number => {
  const title = (book.title || '').toLowerCase();
  const description = stripHtml(book.description).toLowerCase();
  const genres = (book.genres || []).map((genre) => genre.name?.toLowerCase() || '').join(' ');
  const haystack = `${title} ${description} ${genres}`;

  let score = 0;
  for (const keyword of STORY_KEYWORDS) {
    if (haystack.includes(keyword)) score += 3;
  }

  if (haystack.includes('children')) score += 3;
  if (haystack.includes('fairy')) score += 3;
  if (haystack.includes('sleep')) score += 2;
  if (book.sections && book.sections.length > 0) score += 2;

  return score;
};

const mapBookToStory = (book: LibriVoxBook, index: number): PublicStoryItem | null => {
  const title = (book.title || '').trim();
  if (!title) return null;

  const section = getPrimaryPlayableSection(book.sections);
  if (!section?.listen_url) return null;

  const playtimeSeconds = Number.parseInt(section.playtime || '', 10);
  const totalTimeSeconds = Number.parseInt(book.totaltimesecs || '', 10);
  const durationSeconds = Number.isFinite(playtimeSeconds) && playtimeSeconds > 0
    ? playtimeSeconds
    : Number.isFinite(totalTimeSeconds) && totalTimeSeconds > 0
      ? totalTimeSeconds
      : 1200;

  const durationMinutes = Math.max(5, Math.round(durationSeconds / 60));
  const description = stripHtml(book.description) || 'Public-domain narrated story.';

  return {
    id: `public-story-${book.id || index}`,
    title,
    description,
    durationMinutes,
    uri: section.listen_url,
    image: STORY_IMAGES[index % STORY_IMAGES.length],
  };
};

const fetchList = async (url: string): Promise<LibriVoxBook[]> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`LibriVox request failed: ${response.status}`);

  const data = (await response.json()) as LibriVoxResponse;
  return Array.isArray(data.books) ? data.books : [];
};

const loadCachedStories = async (): Promise<StoryCachePayload | null> => {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as StoryCachePayload;
    if (!parsed || !Array.isArray(parsed.stories) || typeof parsed.savedAt !== 'number') {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
};

const saveCachedStories = async (stories: PublicStoryItem[]) => {
  try {
    const payload: StoryCachePayload = {
      savedAt: Date.now(),
      stories,
    };
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // no-op for cache failures
  }
};

const fetchAndBuildStories = async (limit: number): Promise<PublicStoryItem[]> => {
  const bookLists = await Promise.all(LIST_ENDPOINTS.map((endpoint) => fetchList(endpoint)));
  const books = bookLists.flat();

  const ranked = books
    .map((book) => ({ book, score: getStoryScore(book) }))
    .filter((entry) => entry.score >= 5)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.book);

  const stories: PublicStoryItem[] = [];
  const titleSet = new Set<string>();

  for (const [index, book] of ranked.entries()) {
    if (stories.length >= limit) break;
    const mapped = mapBookToStory(book, index);
    if (!mapped) continue;

    const key = mapped.title.toLowerCase();
    if (titleSet.has(key)) continue;

    titleSet.add(key);
    stories.push(mapped);
  }

  if (stories.length > 0) {
    await saveCachedStories(stories);
    return stories;
  }

  return FALLBACK_PUBLIC_STORIES.slice(0, limit);
};

export const getPlayablePublicStories = async (limit = 8): Promise<PublicStoryItem[]> => {
  const result = await getPlayablePublicStoriesWithMeta(limit);
  return result.stories;
};

export const getPlayablePublicStoriesWithMeta = async (limit = 8): Promise<PublicStoriesResult> => {
  const cached = await loadCachedStories();
  const hasCache = !!cached && cached.stories.length > 0;
  const cacheIsFresh = hasCache && Date.now() - cached.savedAt < CACHE_TTL_MS;

  if (cacheIsFresh) {
    return {
      stories: cached.stories.slice(0, limit),
      lastUpdated: cached.savedAt,
      source: 'cache',
    };
  }

  try {
    const freshStories = await fetchAndBuildStories(limit);
    const cachedAfterFetch = await loadCachedStories();
    return {
      stories: freshStories.slice(0, limit),
      lastUpdated: cachedAfterFetch?.savedAt ?? Date.now(),
      source: freshStories.some((story) => story.id.startsWith('public-story-gutenberg-'))
        ? 'fallback'
        : 'network',
    };
  } catch (error) {
    console.warn('Failed to fetch public stories:', error);
    if (hasCache) {
      return {
        stories: cached!.stories.slice(0, limit),
        lastUpdated: cached!.savedAt,
        source: 'cache-stale',
      };
    }

    return {
      stories: FALLBACK_PUBLIC_STORIES.slice(0, limit),
      lastUpdated: null,
      source: 'fallback',
    };
  }
};
