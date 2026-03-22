import React, { useState, useEffect, useMemo } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { useAppContext } from '../contexts/AppContext';
import { TitleCard } from './TitleCard';
import { TMDBResult, searchTMDB } from '../api/tmdb';

export function MatchContainer() {
    const { parsedFiles, fileMappings, confirmedMap, confirmMatch, autoConfirm, apiKey } = useAppContext();
    const [isExporting, setIsExporting] = useState(false);
    const [titlesList, setTitlesList] = useState<{ title: string, type: string }[]>([]);
    const [resultsCache, setResultsCache] = useState<Record<string, TMDBResult[] | 'error'>>({});

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

        const groups = new Map<string, { title: string, type: string }>();
        parsedFiles.forEach(file => {
            const currentMapping = fileMappings[file.fileName];
            if (!currentMapping || !currentMapping.title) return;

            file.rows.forEach(row => {
                let t = row[currentMapping.title];
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

                if (!groups.has(key)) {
                    groups.set(key, { title: t, type: typeStr });
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
            // Find titles not in confirmed map and not in results cache
            const pending = titlesList.filter(item =>
                !confirmedMap[item.title] &&
                resultsCache[item.title] === undefined
            );

            if (pending.length === 0) return;

            const batch = pending.slice(0, 5); // Search 5 at a time

            const searchPromises = batch.map(async (item) => {
                try {
                    const results = await searchTMDB(item.title, item.type);
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
    }, [titlesList, confirmedMap, resultsCache, autoConfirm, confirmMatch]);


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
                const category = (file.category || '').toLowerCase();
                const currentMapping = fileMappings[file.fileName];
                if (!currentMapping || !currentMapping.title) return;
                
                file.rows.forEach(row => {
                    const titleRaw = row[currentMapping.title];
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

                    if (category.includes('like') || category.includes('favorite')) {
                        likes.push({ tmdbId, type, title });
                    } else if (category.includes('watchlist') || category.includes('notify')) {
                        notifications.push({
                            tmdbId, type, title, posterPath, releaseDate, seasonNumber, episodeNumber, autoNotify: 'true'
                        });
                    } else if (category.includes('seen') || category.includes('diary') || category.includes('history') || category === '') {
                        seen.push({
                            tmdbId, type, title, posterPath, seenDate: dateStr, seasonNumber, episodeNumber, runtime, genres
                        });
                    } else {
                        // Place into generic lists
                        const listName = file.category || 'List';
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
            saveAs(content, `mediavore_export_${new Date().getTime()}.zip`);

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
