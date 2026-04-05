import React, { useState, useEffect, useMemo, useRef } from 'react';
import JSZip from 'jszip';
import { useAppContext } from '../contexts/AppContext';
import { TitleCard } from './TitleCard';
import { TMDBResult, searchTMDB } from '../api/tmdb';
import { scrapeData } from '../api/scrape';

interface MatchItem {
    title: string;
    year?: string;
    type: string;
    scrapeBaseUrl?: string;
    scrapeTitleSelector?: string;
    scrapeYearSelector?: string;
    isIdMode?: boolean;
    scrapeSeriesBaseUrl?: string;
    scrapeUrl?: string;
}

export function MatchContainer() {
    const { parsedFiles, fileMappings, confirmedMap, confirmMatch, autoConfirm, apiKey } = useAppContext();
    const [isExporting, setIsExporting] = useState(false);
    const [titlesList, setTitlesList] = useState<MatchItem[]>([]);
    const [resultsCache, setResultsCache] = useState<Record<string, TMDBResult[] | 'error' | 'scrape_error'>>({});
    const [customQueries, setCustomQueries] = useState<Record<string, { title: string, year?: string, type: string }>>({});
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const fetchingRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        setResultsCache(prev => {
            const next = { ...prev };
            let hasChanged = false;
            for (const key in next) {
                if (next[key] === 'error' || next[key] === 'scrape_error') {
                    delete next[key];
                    hasChanged = true;
                }
            }
            return hasChanged ? next : prev;
        });
    }, [apiKey]);

    const uniqueGroups = useMemo(() => {
        if (parsedFiles.length === 0) return [];

        const groups = new Map<string, MatchItem>();
        parsedFiles.forEach(file => {
            const currentMapping = fileMappings[file.fileName];
            if (!currentMapping || (!currentMapping.title && !currentMapping.scrapeUrlColumn)) return;

            file.rows.forEach(row => {
                let t = currentMapping.title ? row[currentMapping.title] : row[currentMapping.scrapeUrlColumn!];
                if (!t || typeof t !== 'string') return;
                t = t.trim();
                if (!t) return;

                const isTv = currentMapping.hasSeries && (
                    (currentMapping.type && row[currentMapping.type] && currentMapping.typeValues?.series.includes(row[currentMapping.type])) ||
                    (currentMapping.season && row[currentMapping.season]) ||
                    (currentMapping.episode && row[currentMapping.episode])
                );

                const typeStr = isTv ? 'tv' : 'movie';
                
                let y = currentMapping.year ? row[currentMapping.year] : undefined;
                if (y && typeof y === 'number') y = String(y);
                if (y && typeof y === 'string') y = y.trim();

                const key = y ? `${t}::${y}::${typeStr}` : `${t}::${typeStr}`;

                let scrapeUrl = '';
                if (currentMapping.scrapeUrlColumn && row[currentMapping.scrapeUrlColumn]) {
                    scrapeUrl = row[currentMapping.scrapeUrlColumn];
                }

                if (!groups.has(key)) {
                    groups.set(key, {
                        title: t,
                        year: y,
                        type: typeStr,
                        scrapeBaseUrl: currentMapping.scrapeBaseUrl,
                        scrapeTitleSelector: currentMapping.scrapeTitleSelector,
                        scrapeYearSelector: currentMapping.scrapeYearSelector,
                        isIdMode: currentMapping.isIdMode,
                        scrapeSeriesBaseUrl: currentMapping.scrapeSeriesBaseUrl,
                        scrapeUrl: scrapeUrl
                    });
                }
            });
        });

        return Array.from(groups.values());
    }, [parsedFiles, fileMappings]);

    useEffect(() => {
        setTitlesList(uniqueGroups);
    }, [uniqueGroups]);

    useEffect(() => {
        let active = true;

        const searchNext = async () => {
            // First derive the visible slice of items the user is actually looking at right now
            const unconfirmedList = titlesList.filter(t => !confirmedMap[t.title]);
            const startIndex = (currentPage - 1) * pageSize;
            const visibleList = unconfirmedList.slice(startIndex, startIndex + pageSize); // only process exactly what's visible

            // From that slice, figure out who actually needs a TMDB lookup
            const pending = visibleList.filter(item =>
                resultsCache[item.title] === undefined && !fetchingRef.current.has(item.title)
            );

            if (pending.length === 0) return;

            const batch = pending.slice(0, 5); // Search 5 at a time

            batch.forEach(item => fetchingRef.current.add(item.title));

            const searchPromises = batch.map(async (item) => {
                try {
                    let searchTitle = item.title;
                    let searchYear = item.year;
                    let searchType = item.type;

                    if (customQueries[item.title]) {
                        searchTitle = customQueries[item.title].title;
                        searchYear = customQueries[item.title].year;
                        searchType = customQueries[item.title].type;
                    } else if (item.scrapeUrl || (item.isIdMode && item.scrapeTitleSelector)) {
                        try {
                            let url = '';
                            if (item.scrapeUrl) {
                                url = item.scrapeUrl;
                            } else {
                                const baseUrl = (item.type === 'tv' && item.scrapeSeriesBaseUrl) ? item.scrapeSeriesBaseUrl : item.scrapeBaseUrl;
                                if (baseUrl) {
                                    url = baseUrl.replace('{id}', encodeURIComponent(item.title));
                                }
                            }

                            if (url) {
                                const scraped = await scrapeData(url, item.scrapeTitleSelector || '', item.scrapeYearSelector || '');
                                if (scraped.title) {
                                    searchTitle = scraped.title;
                                    searchYear = scraped.year;

                                    setCustomQueries(prev => ({
                                        ...prev,
                                        [item.title]: { title: scraped.title || '', year: scraped.year, type: searchType }
                                    }));
                                } else {
                                    console.warn('Scraping returned no title for url:', url);
                                }
                            }
                        } catch (err) {
                            console.error('Failed to scrape for:', item.title, err);
                        }
                    }

                    // If after all logic we are still searching for a raw HTTP url, it means scraping failed
                    // or wasn't configured. Don't spam TMDB with URLs, it just fails.
                    if (searchTitle.startsWith('http://') || searchTitle.startsWith('https://')) {
                        setResultsCache(prev => ({ ...prev, [item.title]: 'scrape_error' }));
                        return; // exit the promise mapping early, avoiding TMDB fetch
                    }

                    const results = await searchTMDB(searchTitle, searchType, searchYear);

                    setResultsCache(prev => ({ ...prev, [item.title]: results }));
                    if (autoConfirm && results.length === 1) {
                        confirmMatch(item.title, results[0]);
                    }
                } catch (e) {
                    setResultsCache(prev => ({ ...prev, [item.title]: 'error' }));
                } finally {
                    fetchingRef.current.delete(item.title);
                }
            });

            await Promise.all(searchPromises);
        };

        const timeoutId = setTimeout(() => {
            if (active) {
                searchNext();
            }
        }, 150);

        return () => { 
            active = false; 
            clearTimeout(timeoutId);
        };
    }, [titlesList, confirmedMap, resultsCache, autoConfirm, confirmMatch, customQueries, currentPage, pageSize]);

    useEffect(() => {
        const unconfirmedCount = titlesList.filter(t => !confirmedMap[t.title]).length;
        const totalPages = Math.max(1, Math.ceil(unconfirmedCount / pageSize));
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [titlesList, confirmedMap, pageSize, currentPage]);

    const handleExport = async () => {
        if (parsedFiles.length === 0) return;
        setIsExporting(true);

        try {
            const zip = new JSZip();

            // Add meta.csv
            const metaHeader = ['version', 'exportedAt', 'source'].join(',');
            const metaRow = [1, new Date().toISOString(), 'MediaVore Translator'].join(',');
            zip.file('meta.csv', [metaHeader, metaRow].join('\n'));

            const seen: any[] = [];
            const likes: any[] = [];
            const notifications: any[] = [];
            const lists: any[] = [];

            let listPositions: Record<string, number> = {};
            const exportDedupe = new Set<string>();

            parsedFiles.forEach(file => {
                const currentMapping = fileMappings[file.fileName];
                if (!currentMapping || (!currentMapping.title && !currentMapping.scrapeUrlColumn)) return;

                const category = (currentMapping.category || file.category || '').toLowerCase();

                file.rows.forEach(row => {
                    const titleRaw = currentMapping.title ? row[currentMapping.title] : row[currentMapping.scrapeUrlColumn!];
                    const titleStr = typeof titleRaw === 'string' ? titleRaw.trim() : '';
                    if (!titleStr) return;

                    const confirmed = confirmedMap[titleStr];
                    if (!confirmed) return;
                    
                    const isTv = currentMapping.hasSeries && (
                        (currentMapping.type && row[currentMapping.type] && currentMapping.typeValues?.series.includes(row[currentMapping.type])) ||
                        (currentMapping.season && row[currentMapping.season]) ||
                        (currentMapping.episode && row[currentMapping.episode])
                    );

                    let dateStr = row[currentMapping.date] || '';
                    if (dateStr && dateStr.includes('/')) {
                        const parts = dateStr.split('/');
                        if (parts.length === 3) {
                            // Basic DD/MM/YYYY to YYYY-MM-DD
                            const [d, m, y] = parts;
                            if (y.length === 4) dateStr = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
                        }
                    } else if (dateStr) {
                        const time = Date.parse(dateStr);
                        if (!isNaN(time)) {
                            dateStr = new Date(time).toISOString();
                        }
                    }

                    const tmdbId = confirmed.id;
                    const type = isTv ? 'tv' : 'movie';
                    
                    // Deduplicate identical combinations of movie, date, and exact list type
                    const dedupeKey = `${tmdbId}-${category}-${dateStr}`;
                    if (exportDedupe.has(dedupeKey)) return;
                    exportDedupe.add(dedupeKey);

                    const title = confirmed.name || confirmed.title;
                    const seasonNumber = (isTv && currentMapping.season) ? parseInt(row[currentMapping.season], 10) || '' : '';
                    const episodeNumber = (isTv && currentMapping.episode) ? parseInt(row[currentMapping.episode], 10) || '' : '';
                    const posterPath = confirmed.poster_path || '';
                    const releaseDate = confirmed.release_date || confirmed.first_air_date || '';
                    const runtime = '';
                    const genres = '';

                    let listName = file.category || 'List';
                    if (currentMapping.isMultiList && currentMapping.listNameColumn && row[currentMapping.listNameColumn]) {
                        listName = row[currentMapping.listNameColumn];
                    } else if (currentMapping.category && currentMapping.category !== 'lists') {
                        listName = currentMapping.category;
                    }

                    const listNameLower = listName.toLowerCase();
                    const targetLikesList = (currentMapping.likesListName || '').toLowerCase();

                    if (currentMapping.category === 'likes' ||
                        category.includes('like') || category.includes('favorite') ||
                        (currentMapping.isMultiList && targetLikesList && listNameLower === targetLikesList)) {
                        likes.push({ tmdbId, type, title });
                    } else if (currentMapping.category === 'watchlist' || category.includes('watchlist') || category.includes('notify')) {
                        notifications.push({
                            tmdbId, type, title, posterPath, releaseDate, seasonNumber, episodeNumber, autoNotify: 'true'
                        });
                    } else if (currentMapping.category === 'seen' || category.includes('seen') || category.includes('diary') || category.includes('history') || category === '') {
                        seen.push({
                            tmdbId, type, title, posterPath, seenDate: dateStr, seasonNumber, episodeNumber, runtime, genres
                        });
                    } else {
                        // Place into generic lists
                        if (!listPositions[listName]) listPositions[listName] = 1;
                        lists.push({
                            listName, tmdbId, type, title, position: listPositions[listName]++
                        });
                    }
                });
            });

            const escapeCSV = (val: any) => {
                if (val === null || val === undefined) return '';
                const str = String(val);
                if (str.includes(',') || str.includes('\n') || str.includes('"')) {
                    return `"${str.replace(/"/g, '""')}"`;
                }
                return str;
            };

            const convertToCSV = (items: any[], columns: string[]) => {
                const header = columns.join(',');
                const rows = items.map(item => columns.map(col => escapeCSV(item[col] ?? '')).join(','));
                return [header, ...rows].join('\n');
            };

            zip.file('seen.csv', convertToCSV(seen, ['tmdbId', 'type', 'title', 'posterPath', 'seenDate', 'seasonNumber', 'episodeNumber', 'runtime', 'genres']));
            zip.file('likes.csv', convertToCSV(likes, ['tmdbId', 'type', 'title']));
            zip.file('notifications.csv', convertToCSV(notifications, ['tmdbId', 'type', 'title', 'posterPath', 'releaseDate', 'seasonNumber', 'episodeNumber', 'autoNotify']));
            zip.file('lists.csv', convertToCSV(lists, ['listName', 'tmdbId', 'type', 'title', 'position']));

            const content = await zip.generateAsync({ type: 'blob' });

            const url = URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = url;
            a.download = `mediavore_export_${new Date().getTime()}.mdv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

        } catch (e) {
            alert("Export failed: " + e);
        }

        setIsExporting(false);
    };

    const confirmedCount = titlesList.filter(t => confirmedMap[t.title]).length;
    const unconfirmedList = titlesList.filter(t => !confirmedMap[t.title]);
    const pendingCount = unconfirmedList.length;

    // Pagination logic
    const totalPages = Math.max(1, Math.ceil(unconfirmedList.length / pageSize));
    // Ensure currentPage is valid
    const safeCurrentPage = Math.min(currentPage, totalPages);
    if (safeCurrentPage !== currentPage) {
        // Technically an anti-pattern to set state during render, but works fine in a React basic top-down
        // Actually better to useEffect, but for simplicity, we'll just use safeCurrentPage for math
    }
    const startIndex = (safeCurrentPage - 1) * pageSize;
    const visibleList = unconfirmedList.slice(startIndex, startIndex + pageSize);

    return (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex justify-between items-center sticky top-4 z-10">
                <div className="flex gap-4 items-center">
                    <div className="flex flex-col">
                        <span className="text-xs text-gray-500 uppercase font-bold tracking-wide">Unique</span>
                        <span className="text-xl font-black text-gray-800">{titlesList.length}</span>
                    </div>
                    <div className="w-px h-10 bg-gray-200"></div>
                    <div className="flex flex-col">
                        <span className="text-xs text-green-600 uppercase font-bold tracking-wide">Confirmed</span>
                        <span className="text-xl font-black text-green-600">{confirmedCount}</span>
                    </div>
                    <div className="w-px h-10 bg-gray-200"></div>
                    <div className="flex flex-col">
                        <span className="text-xs text-orange-500 uppercase font-bold tracking-wide">Pending</span>
                        <span className="text-xl font-black text-orange-500">{pendingCount}</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {unconfirmedList.length > 0 && (
                        <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                            <label className="text-xs font-bold text-gray-500 uppercase">Items per page:</label>
                            <select
                                value={pageSize}
                                onChange={(e) => {
                                    setPageSize(Number(e.target.value));
                                    setCurrentPage(1);
                                }}
                                className="bg-white border border-gray-300 rounded px-2 py-1 text-sm font-bold"
                            >
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                        </div>
                    )}
                    <button
                        onClick={handleExport}
                        disabled={isExporting || confirmedCount === 0}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-bold shadow disabled:opacity-50 transition-colors"
                    >
                        {isExporting ? 'Exporting...' : 'Export Translation'}
                    </button>
                </div>
            </div>

            {unconfirmedList.length > 0 && totalPages > 1 && (
                <div className="flex items-center justify-between bg-white px-4 py-3 rounded-lg border border-gray-200 shadow-sm">
                    <div className="text-sm text-gray-600 font-bold">
                        Showing {startIndex + 1} to {Math.min(startIndex + pageSize, unconfirmedList.length)} of {unconfirmedList.length} items
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            disabled={safeCurrentPage === 1}
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-50 text-sm font-bold"
                        >
                            Previous
                        </button>
                        <span className="text-sm font-bold text-gray-700 px-2">
                            Page {safeCurrentPage} of {totalPages}
                        </span>
                        <button
                            disabled={safeCurrentPage === totalPages}
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-50 text-sm font-bold"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 gap-6">
                {visibleList.map(item => {
                    let sourceUrl = item.scrapeUrl || '';
                    if (!sourceUrl) {
                        const baseUrl = (item.type === 'tv' && item.scrapeSeriesBaseUrl) ? item.scrapeSeriesBaseUrl : item.scrapeBaseUrl;
                        if (baseUrl) {
                            sourceUrl = baseUrl.replace('{id}', encodeURIComponent(item.title));
                        }
                    }

                    return (
                        <TitleCard
                            key={`${item.title}::${item.type}`}
                            item={item}
                            sourceUrl={sourceUrl}
                            results={resultsCache[item.title]}
                            onConfirm={(match) => confirmMatch(item.title, match)}
                            customQuery={customQueries[item.title]}
                            onManualSearch={(newSearch) => {
                                setCustomQueries(prev => ({ ...prev, [item.title]: newSearch }));
                                setResultsCache(prev => {
                                    const next = { ...prev };
                                    delete next[item.title];
                                    return next;
                                });
                            }}
                        />
                    )
                })}

                {unconfirmedList.length > 0 && totalPages > 1 && (
                    <div className="flex items-center justify-center gap-4 bg-white px-4 py-4 rounded-lg border border-gray-200 shadow-sm mt-4">
                        <button
                            disabled={safeCurrentPage === 1}
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            className="bg-white px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 text-sm font-bold shadow-sm transition-colors"
                        >
                            ← Previous Page
                        </button>
                        <span className="text-sm font-bold text-gray-500 uppercase">
                            Page {safeCurrentPage} of {totalPages}
                        </span>
                        <button
                            disabled={safeCurrentPage === totalPages}
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            className="bg-white px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 text-sm font-bold shadow-sm transition-colors"
                        >
                            Next Page →
                        </button>
                    </div>
                )}

                {pendingCount === 0 && titlesList.length > 0 && (
                    <div className="bg-green-50 text-green-800 p-8 rounded-lg text-center border border-green-200 shadow-sm">
                        <h3 className="text-2xl font-bold mb-2">All set! 🎉</h3>
                        <p className="text-lg opacity-90 mb-4">All {titlesList.length} unique titles have been mapped.</p>
                        <button
                            onClick={handleExport}
                            className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-bold text-lg shadow transition-colors"
                        >
                            Export Translation
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
