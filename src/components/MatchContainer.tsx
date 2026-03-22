import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { TitleCard } from './TitleCard';
import { TMDBResult, searchTMDB } from '../api/tmdb';

export function MatchContainer() {
    const { parsedFile, mapping, confirmedMap, confirmMatch, autoConfirm, apiKey } = useAppContext();
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
        if (!parsedFile || !mapping.title) return [];

        const groups = new Map<string, { title: string, type: string }>();
        parsedFile.rows.forEach(row => {
            let t = row[mapping.title];
            if (!t || typeof t !== 'string') return;
            t = t.trim();
            if (!t) return;

            const isTv = mapping.hasSeries && (
                (mapping.type && row[mapping.type] && mapping.typeValues?.series.includes(row[mapping.type])) ||
                (mapping.season && row[mapping.season]) ||
                (mapping.episode && row[mapping.episode])
            );

            const typeStr = isTv ? 'tv' : 'movie';
            const key = `${t}::${typeStr}`;

            if (!groups.has(key)) {
                groups.set(key, { title: t, type: typeStr });
            }
        });

        return Array.from(groups.values());
    }, [parsedFile, mapping]);

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


    const handleExport = () => {
        if (!parsedFile) return;
        setIsExporting(true);

        try {
            const output = parsedFile.rows.map(row => {
                const titleStr = typeof row[mapping.title] === 'string' ? row[mapping.title].trim() : '';
                if (!titleStr) return null;

                const confirmed = confirmedMap[titleStr];
                if (!confirmed) return null;

                const isTv = mapping.hasSeries && (
                    (mapping.type && row[mapping.type] && mapping.typeValues?.series.includes(row[mapping.type])) ||
                    (mapping.season && row[mapping.season]) ||
                    (mapping.episode && row[mapping.episode])
                );

                let dateStr = row[mapping.date] || '';
                // Try simple ISO conversion if it's D/M/Y or something, but we just leave it for now
                // or attempt a simple parse
                if (dateStr && dateStr.includes('/')) {
                    const parts = dateStr.split('/');
                    if (parts.length === 3) {
                        const [d, m, y] = parts;
                        if (y.length === 4) dateStr = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
                    }
                }

                return {
                    tmdbId: confirmed.id,
                    type: isTv ? 'tv' : 'movie',
                    title: confirmed.name || confirmed.title,
                    seenDate: dateStr,
                    seasonNumber: (isTv && mapping.season) ? parseInt(row[mapping.season], 10) || null : null,
                    episodeNumber: (isTv && mapping.episode) ? parseInt(row[mapping.episode], 10) || null : null
                };
            }).filter(Boolean);

            const blob = new Blob([JSON.stringify(output, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `mediavore_export_${new Date().getTime()}.json`;
            a.click();
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
                    {isExporting ? 'Exporting...' : 'Export JSON'}
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
                            Export Mapped JSON
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
