export interface ScrapeResult {
  title?: string;
  year?: string;
}

/**
 * Scrapes data from a URL using a CORS proxy and CSS selectors
 * @param url - The URL to scrape
 * @param titleSelector - CSS selector for the title element
 * @param yearSelector - CSS selector for the year element
 * @returns Promise with title and year extracted from the page
 */
export async function scrapeData(
  url: string,
  titleSelector: string,
  yearSelector: string
): Promise<ScrapeResult> {
  if (!url) return {};
  
  try {
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch from proxy: ${response.statusText}`);
    }
    
    const htmlContent = await response.text();
    
    if (!htmlContent) {
      throw new Error('No content returned from proxy');
    }
    
    // Parse HTML using DOMParser
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    
    const result: ScrapeResult = {};
    
    if (titleSelector) {
      const titleElement = doc.querySelector(titleSelector);
      if (titleElement) {
        result.title = titleElement.textContent?.trim();
      }
    }
    
    // Fallback if title is still missing
    if (!result.title) {
      const ogTitle = doc.querySelector('meta[property="og:title"]');
      if (ogTitle) {
        result.title = ogTitle.getAttribute('content')?.trim();
      } else {
        const docTitle = doc.querySelector('title');
        if (docTitle) {
          result.title = docTitle.textContent?.trim();
        }
      }
    }

    // Clean up common suffixes
    if (result.title) {
      result.title = result.title
        .replace(/ - IMDb$/, '')
        .replace(/ \([^)]+\) - IMDb$/, '') // Often IMDb has year in title like "Movie (2020) - IMDb"
        .replace(/ - Letterboxd$/, '')
        .replace(/ — The Movie Database \(TMDB\)$/, '')
        .replace(/ — TMDB$/, '')
        .trim();
    }
    
    if (yearSelector) {
      const yearElement = doc.querySelector(yearSelector);
      if (yearElement) {
        // Extract just the digits if there's surrounding text, or take the whole text
        const text = yearElement.textContent?.trim();
        if (text) {
          const match = text.match(/\d{4}/);
          result.year = match ? match[0] : text;
        }
      }
    }
    
    return result;
  } catch (error) {
    console.error('Scrape error:', error);
    // Don't throw, just return empty so it degrades gracefully
    return {};
  }
}
