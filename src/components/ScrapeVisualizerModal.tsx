import React, { useState, useRef, useEffect } from 'react';

export interface ScrapeVisualizerModalProps {
  baseUrl: string;
  initialTitleSelector?: string;
  initialYearSelector?: string;
  onSave: (titleSelector: string, yearSelector: string) => void;
  onClose: () => void;
}

export function ScrapeVisualizerModal({ baseUrl, initialTitleSelector, initialYearSelector, onSave, onClose }: ScrapeVisualizerModalProps) {
  const getInitialTestUrl = (): string => {
    if (baseUrl.includes('{id}')) {
      return '';
    }
    return baseUrl;
  };

  const [testUrl, setTestUrl] = useState<string>(getInitialTestUrl());
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeField, setActiveField] = useState<'title' | 'year'>('title');
  const [titleSelector, setTitleSelector] = useState<string>(initialTitleSelector || '');
  const [yearSelector, setYearSelector] = useState<string>(initialYearSelector || '');
  
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const cleanHtml = (html: string, sourceUrl: string): string => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // Remove scripts
      doc.querySelectorAll('script').forEach((el) => el.remove());

      // Inject base URL
      try {
        const urlObj = new URL(sourceUrl);
        const base = doc.createElement('base');
        base.href = urlObj.origin;
        doc.head.prepend(base);
      } catch(e) {}

      // Inject highlight CSS
      const style = doc.createElement('style');
      style.innerHTML = `
        .mediavore-highlight { outline: 3px solid red !important; cursor: pointer !important; }
        .mediavore-hover { background-color: rgba(255, 0, 0, 0.2) !important; outline: 2px dashed red !important; }
      `;
      doc.head.append(style);

      guessSelectors(doc);

      // Return full HTML text
      return doc.documentElement.outerHTML;
    } catch (err) {
      console.error('Error parsing HTML:', err);
      return html;
    }
  };

  const generateSelector = (element: HTMLElement): string => {
    const selectors: string[] = [];
    let current: HTMLElement | null = element;

    while (current && current !== document.body && current !== document.documentElement) {
      let selector = current.tagName.toLowerCase();

      if (current.id) {
        selector = `#${current.id}`;
        selectors.unshift(selector);
        break;
      }

      if (current.className) {
        const clsArray = Array.from(current.classList).filter(c => !c.startsWith('_') && c !== 'mediavore-hover' && c !== 'mediavore-highlight');
        if (clsArray.length > 0) {
          selector += `.${clsArray.join('.')}`;
        }
      }

      selectors.unshift(selector);
      current = current.parentElement;
    }

    return selectors.join(' > ');
  };

  const guessSelectors = (doc: Document) => {
    if (!titleSelector) {
      const metaTitle = doc.querySelector('meta[property="og:title"]');
      if (metaTitle) {
        setTitleSelector('meta[property="og:title"]');
      } else {
        const h1 = doc.querySelector('h1');
        if (h1) setTitleSelector(generateSelector(h1 as HTMLElement));
        else if (doc.title) setTitleSelector('title');
      }
    }
    
    if (!yearSelector) {
      const walker = document.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, null);
      let node;
      const yearRegex = /(19|20)\d{2}/;
      while ((node = walker.nextNode())) {
        if (node.textContent && yearRegex.test(node.textContent.trim())) {
          const parent = node.parentElement;
          if (parent && ['SPAN', 'P', 'DIV', 'H1', 'H2', 'H3'].includes(parent.tagName.toUpperCase())) {
            const txt = node.textContent.trim();
            if (txt.length < 15) { // Likely just a short string with year
                setYearSelector(generateSelector(parent));
                break;
            }
          }
        }
      }
    }
  };

  const handleFetchInfo = async (): Promise<void> => {
    if (!testUrl.trim()) {
      setError('Please enter a valid URL');
      return;
    }

    setLoading(true);
    setError(null);
    setHtmlContent(null);

    try {
      const encodedUrl = encodeURIComponent(testUrl);
      const proxyUrl = `https://corsproxy.io/?${encodedUrl}`;

      const response = await fetch(proxyUrl);
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const rawHtml = await response.text();

      if (!rawHtml) {
        throw new Error('No HTML content returned from the URL');
      }

      const cleaned = cleanHtml(rawHtml, testUrl);
      
      setHtmlContent(cleaned);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch URL. Check URL and try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };


  const handleIframeLoad = () => {
    const iframeDoc = iframeRef.current?.contentDocument;
    if (!iframeDoc) return;

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      target.classList.add('mediavore-hover');
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      target.classList.remove('mediavore-hover');
    };

    const handleClick = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const target = e.target as HTMLElement;
      iframeDoc.querySelectorAll('.mediavore-highlight').forEach(el => el.classList.remove('mediavore-highlight'));
      
      target.classList.add('mediavore-highlight');
      const selector = generateSelector(target);

      window.dispatchEvent(new CustomEvent('mediavoreSelectorPicked', { detail: { selector } }));
    };

    iframeDoc.body.addEventListener('mouseover', handleMouseOver);
    iframeDoc.body.addEventListener('mouseout', handleMouseOut);
    iframeDoc.body.addEventListener('click', handleClick, true);
  };

  useEffect(() => {
    const handlePick = (e: any) => {
        const sel = e.detail.selector;
        setActiveField(prev => {
            if (prev === 'title') {
                setTitleSelector(sel);
            } else {
                setYearSelector(sel);
            }
            return prev;
        });
    };
    window.addEventListener('mediavoreSelectorPicked', handlePick);
    return () => window.removeEventListener('mediavoreSelectorPicked', handlePick);
  }, []);
  
  useEffect(() => {
    if (testUrl && testUrl.trim() !== '') {
        handleFetchInfo();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 bg-black/50 flex flex-col items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg flex flex-col w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center shrink-0">
          <h2 className="text-xl font-bold m-0 flex items-center gap-2">
            🔍 Web Scraper Setup
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 font-bold text-xl">&times;</button>
        </div>

        <div className="p-4 bg-white border-b border-gray-200 flex flex-col md:flex-row gap-4 shrink-0 shadow-sm z-10 relative">
          <div className="flex-1 flex gap-2">
            <input
              type="text"
              className="flex-1 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-gray-400"
              placeholder="Enter a specific URL (e.g. film page) to preview..."
              value={testUrl}
              onChange={(e) => setTestUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleFetchInfo()}
            />
            <button
              onClick={handleFetchInfo}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2 rounded shrink-0 transition-colors disabled:opacity-50"
            >
              {loading ? 'Fetching...' : 'Fetch'}
            </button>
          </div>
          
          <div className="flex gap-4 items-center bg-gray-50 px-4 py-2 rounded border border-gray-200">
             <div className="text-sm font-bold text-gray-700 mr-2">Configuring:</div>
             <label className="flex items-center gap-2 cursor-pointer font-semibold">
                <input 
                    type="radio" 
                    name="activeField" 
                    checked={activeField === 'title'} 
                    onChange={() => setActiveField('title')} 
                    className="w-4 h-4 text-blue-600"
                />
                Title
             </label>
             <label className="flex items-center gap-2 cursor-pointer font-semibold">
                <input 
                    type="radio" 
                    name="activeField" 
                    checked={activeField === 'year'} 
                    onChange={() => setActiveField('year')} 
                    className="w-4 h-4 text-blue-600"
                />
                Year
             </label>
          </div>
        </div>

        <div className="flex-1 overflow-hidden relative bg-gray-100 flex">
            <div className="w-80 bg-white border-r border-gray-200 p-4 flex flex-col gap-4 overflow-y-auto z-10 shadow-lg">
                <p className="text-sm text-gray-600">
                    Hover over the fetched webpage and click elements to automatically generate their CSS selectors. 
                </p>

                <div className={`p-3 rounded border-2 transition-all ${activeField === 'title' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'}`}>
                    <label className="block text-sm font-bold text-gray-800 mb-1">
                        Title Selector {activeField === 'title' && <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full ml-1">Active</span>}
                    </label>
                    <input 
                        type="text" 
                        value={titleSelector} 
                        onChange={e => setTitleSelector(e.target.value)}
                        placeholder="e.g. h1.title"
                        className="w-full p-2 border border-gray-300 rounded text-sm font-mono"
                    />
                </div>

                <div className={`p-3 rounded border-2 transition-all ${activeField === 'year' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'}`}>
                    <label className="block text-sm font-bold text-gray-800 mb-1">
                        Year Selector {activeField === 'year' && <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full ml-1">Active</span>}
                    </label>
                    <input 
                        type="text" 
                        value={yearSelector} 
                        onChange={e => setYearSelector(e.target.value)}
                        placeholder="e.g. .release-date"
                        className="w-full p-2 border border-gray-300 rounded text-sm font-mono"
                    />
                </div>

                <button 
                    onClick={() => onSave(titleSelector, yearSelector)}
                    className="mt-auto bg-[#2ecc71] hover:bg-[#27ae60] text-white font-bold py-3 rounded shadow-sm w-full transition-colors"
                >
                    Save Selectors
                </button>
            </div>

            <div className="flex-1 bg-white relative">
                {error ? (
                    <div className="p-8 text-center text-red-600 bg-red-50 m-4 rounded border border-red-200">
                        <p className="font-bold text-lg mb-2">Fetch Error</p>
                        <p>{error}</p>
                    </div>
                ) : loading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/80">
                        <div className="text-center">
                            <p className="text-gray-600 font-semibold">Loading page...</p>
                        </div>
                    </div>
                ) : htmlContent ? (
                    <iframe 
                        ref={iframeRef}
                        srcDoc={htmlContent}
                        onLoad={handleIframeLoad}
                        className="w-full h-full border-none"
                        sandbox="allow-same-origin allow-scripts allow-popups"
                        title="Web Scraper Visualizer"
                    />
                ) : (
                    <div className="p-8 text-center text-gray-500 flex flex-col items-center justify-center h-full">
                        <p className="max-w-md mx-auto">
                            Enter a URL to preview
                        </p>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
}
