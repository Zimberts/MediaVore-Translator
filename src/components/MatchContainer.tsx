import React, { useState, useEffect, useMemo } from 'react';
import JSZip from 'jszip';
import { useAppContext } from '../contexts/AppContext';
import { TitleCard } from './TitleCard';
import { TMDBResult, searchTMDB } from '../api/tmdb';
import { scrapeData } from '../api/scrape';

interface MatchItem {
    title: string;
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
    const [resultsCache, setResultsCache] = useState<Record<string, TMDBResult[] | 'error'>>({});
    const [customQueries, setCustomQueries] = useState<Record<string, {title: string, year?: string, type: string}>>({});

    useEffect(() => {
        setResultsCache(prev => {
            const next = { ...prev };
            let hasChanged = false;
            for (const key in next) {
                if (next[key] === 'error') {
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
                const key = `${t}::${typeStr}`;

                let scrapeUrl = '';
                if (currentMapping.scrapeUrlColumn && row[currentMapping.scrapeUrlColumn]) {
                    scrapeUrl = row[currentMapping.scrapeUrlColumn];
                }

                if (!groups.has(key)) {
                    groups.set(key, {
                        title: t,
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
            const visibleList = unconfirmedList.slice(0, 20); // only process exactly what's visible
            
            // From that slice, figure out who actually needs a TMDB lookup
            const pending = visibleList.filter(item =>
                resultsCache[item.title] === undefined
            );

            if (pending.length === 0) return;

            const batch = pending.slice(0, 5); // Search 5 at a time

            const searchPromises = batch.map(async (item) => {
                try {
                    let searchTitle = item.title;
                    let searchYear = undefined;
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
                                    
                                    if (active) {
                                        setCustomQueries(prev => ({
                                            ...prev,
                                            [item.title]: { title: scraped.title || '', year: scraped.year, type: searchType }
                                        }));
                                    }
                                    return; // Defer TMDB search to the next effect cycle which uses the new customQuery
                                }
                            }
                        } catch (err) {
                            console.error('Failed to scrape for:', item.title, err);
                        }
                    }

                    const results = await searchTMDB(searchTitle, searchType, searchYear);
                    if (active) {
                        setResultsCache(prev => ({ ...prev, [item.title]: results }));
                        if (autoConfirm && results.length === 1) {
                            confirmMatch(item.title, results[0]);
                        }
                    }
                } catch (e) {
                    if (active) {
                        setResultsCache(prev => ({ ...prev, [item.title]: 'error' }));
                    }
                }
            });

            await Promise.all(searchPromises);
            if (active && pending.length > 5) {
                setTimeout(searchNext, 500); // small delay before next batch
            }
        };

        searchNext();

        return () => { active = false; };
    }, [titlesList, confirmedMap, resultsCache, autoConfirm, confirmMatch, customQueries]);

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
    const pendingCount = titlesList.length - confirmedCount;

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

                <button
                    onClick={handleExport}
                    disabled={isExporting || confirmedCount === 0}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-bold shadow disabled:opacity-50 transition-colors"
                >
                    {isExporting ? 'Exporting...' : 'Export Translation'}
                </button>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {titlesList.filter(t => !confirmedMap[t.title]).map(item => (
                    <TitleCard
                        key={`${item.title}::${item.type}`}
                        item={item}
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
                ))}

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
