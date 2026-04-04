import React, { useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { defaultFieldMapping } from '../utils/storage';
import { ScrapeVisualizerModal } from './ScrapeVisualizerModal';
import { autoSuggestMapping } from '../utils/parsers';

export function FieldMapperModal({ fileName, onClose }: { fileName: string, onClose: () => void }) {
    const { parsedFiles, fileMappings, updateFileMapping } = useAppContext();
    const file = parsedFiles.find(f => f.fileName === fileName);
    const headers = file ? file.headers : [];

    // We get the current mapping for this specific file, or fallback to default
    const [localMap, setLocalMap] = useState(() => {
        const existing = fileMappings[fileName] || {};
        let cat = existing.category;
        if (!cat) {
            const lowerName = fileName.toLowerCase();
            if (lowerName.includes('watchlist')) cat = 'watchlist';
            else if (lowerName.includes('like') || lowerName.includes('favorite') || lowerName.includes('loved')) cat = 'likes';
            else if (lowerName.includes('list')) cat = 'lists';
            else cat = 'seen';
        }
        return { ...defaultFieldMapping, ...existing, category: cat };
    });
    const [showVisualizer, setShowVisualizer] = useState<boolean>(false);
    const sampleRow = file?.rows?.[0];

    const handleSave = () => {
        updateFileMapping(fileName, localMap);
        onClose();
    };

    const restoreDefaults = () => {
        const totalRowsInAllFiles = parsedFiles.reduce((acc, f) => {
            acc[f.fileName] = f.rows.length;
            return acc;
        }, {} as Record<string, number>);
        
        const suggested = autoSuggestMapping(headers, file?.rows || [], totalRowsInAllFiles);
        let cat = suggested.category;
        if (!cat) {
            const lowerName = fileName.toLowerCase();
            if (lowerName.includes('watchlist')) cat = 'watchlist';
            else if (lowerName.includes('like') || lowerName.includes('favorite') || lowerName.includes('loved')) cat = 'likes';
            else if (lowerName.includes('list')) cat = 'lists';
            else cat = 'seen';
        }
        setLocalMap({ ...defaultFieldMapping, ...suggested, category: cat });
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-lg">
                    <h2 className="text-xl font-bold m-0 text-gray-800">Map Input Columns for {fileName}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 font-bold text-xl leading-none">&times;</button>
                </div>

                <div className="p-6">
                    <div className="mb-6 flex justify-between items-center bg-blue-50 p-3 rounded border border-blue-100">
                        <span className="text-sm text-blue-800">Link your file's columns to the correct fields</span>
                        <button
                            onClick={restoreDefaults}
                            className="bg-white border border-blue-500 text-blue-500 hover:bg-blue-50 px-3 py-1 rounded text-sm font-bold transition-colors"
                        >
                            Restore Defaults
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div className="bg-gray-50 p-4 rounded border border-gray-200">
                            <label className="block text-sm font-bold text-gray-700 mb-1">File Category</label>
                            <select
                                className="w-full p-2 border border-gray-300 rounded md:w-1/2 mb-3"
                                value={localMap.category || ''} onChange={e => setLocalMap({ ...localMap, category: e.target.value })}
                            >
                                <option value="seen">Seen / History</option>
                                <option value="likes">Likes / Favorites</option>
                                <option value="watchlist">Watchlist</option>
                                <option value="lists">Custom List(s)</option>
                            </select>

                            {(localMap.category === 'lists' || !localMap.category) && (
                                <div className="mt-4 border-t border-gray-200 pt-3">
                                    <label className="flex items-center gap-2 mb-3 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 text-blue-600 rounded border-gray-300"
                                            checked={localMap.isMultiList || false}
                                            onChange={e => setLocalMap({ ...localMap, isMultiList: e.target.checked })}
                                        />
                                        <span className="font-bold text-gray-700">File contains multiple distinct lists</span>
                                    </label>

                                    {localMap.isMultiList && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-1">List Name Column</label>
                                                <select
                                                    className="w-full p-2 border border-gray-300 rounded"
                                                    value={localMap.listNameColumn || ''} onChange={e => setLocalMap({ ...localMap, listNameColumn: e.target.value })}
                                                >
                                                    <option value="">-- Required for Multi-List --</option>
                                                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-1">List to treat as 'Likes' (Optional)</label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g. Favorites, Loved"
                                                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                                    value={localMap.likesListName || ''}
                                                    onChange={e => setLocalMap({ ...localMap, likesListName: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded border border-gray-200">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Title or ID (Required)</label>
                                <select
                                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    value={localMap.title}
                                    onChange={e => setLocalMap({ ...localMap, title: e.target.value })}
                                >
                                    <option value="">-- Select Column --</option>
                                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Media Type</label>
                                <select
                                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    value={localMap.type}
                                    onChange={e => setLocalMap({ ...localMap, type: e.target.value })}
                                >
                                    <option value="">-- Auto-detect --</option>
                                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="bg-gray-50 p-4 rounded border border-gray-200">
                            <label className="flex items-center gap-2 mb-3 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 text-blue-600 rounded border-gray-300"
                                    checked={localMap.isIdMode || false}
                                    onChange={e => setLocalMap({ ...localMap, isIdMode: e.target.checked })}
                                />
                                <span className="font-bold text-gray-700">File contains IDs rather than Titles (Enable URL Fetching)</span>
                            </label>

                            {localMap.isIdMode && (
                                <div className="mt-4 border-t border-gray-200 pt-3">
                                    <p className="text-xs text-gray-500 mb-3">Select a column containing the URL directly, or set URL patterns to fetch details from the web before searching TMDB.</p>
                                    <div className="grid grid-cols-1 gap-3">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-600 mb-1">Media URL Column (Optional - overrides Base URL if present)</label>
                                            <select
                                                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                                value={localMap.scrapeUrlColumn || ''}
                                                onChange={e => setLocalMap({ ...localMap, scrapeUrlColumn: e.target.value })}
                                            >
                                                <option value="">-- Optional: specify column containing direct URLs --</option>
                                                {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-600 mb-1">Movie Base URL (use {"{id}"} placeholder - fallback)</label>
                                            <input
                                                type="text"
                                                placeholder="https://example.com/film/{id}/"
                                                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                                value={localMap.scrapeBaseUrl || ''}
                                                onChange={e => setLocalMap({ ...localMap, scrapeBaseUrl: e.target.value })}
                                            />
                                        </div>
                                        {localMap.hasSeries && (
                                            <div>
                                                <label className="block text-xs font-bold text-gray-600 mb-1">TV Series Base URL (Optional - if different)</label>
                                                <input
                                                    type="text"
                                                    placeholder="https://example.com/show/{id}/"
                                                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                                    value={localMap.scrapeSeriesBaseUrl || ''}
                                                    onChange={e => setLocalMap({ ...localMap, scrapeSeriesBaseUrl: e.target.value })}
                                                />
                                            </div>
                                        )}
                                        <div className="mt-2 text-right">
                                            <button 
                                                onClick={(e) => { e.preventDefault(); setShowVisualizer(true); }}
                                                disabled={!localMap.scrapeBaseUrl && !localMap.scrapeUrlColumn}
                                                className="bg-blue-100 hover:bg-blue-200 text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed font-bold px-3 py-1.5 rounded text-sm transition-colors border border-blue-200 shadow-sm"
                                            >
                                                🔍 Web Scraper Setup
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-1">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-600 mb-1">
                                                    Title CSS Selector
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g., h1.title"
                                                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                                    value={localMap.scrapeTitleSelector || ''}
                                                    onChange={e => setLocalMap({ ...localMap, scrapeTitleSelector: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-600 mb-1">
                                                    Year CSS Selector
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g., .release-year"
                                                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                                    value={localMap.scrapeYearSelector || ''}
                                                    onChange={e => setLocalMap({ ...localMap, scrapeYearSelector: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="border border-gray-200 p-4 rounded">
                            <label className="flex items-center gap-2 mb-3 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                    checked={localMap.hasSeries}
                                    onChange={e => setLocalMap({ ...localMap, hasSeries: e.target.checked })}
                                />
                                <span className="font-bold text-gray-700">Dataset contains TV Series</span>
                            </label>

                            {localMap.hasSeries && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 bg-gray-50 p-3 rounded">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Season Column</label>
                                        <select
                                            className="w-full p-2 border border-gray-300 rounded"
                                            value={localMap.season} onChange={e => setLocalMap({ ...localMap, season: e.target.value })}
                                        >
                                            <option value="">-- Optional --</option>
                                            {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Episode Column</label>
                                        <select
                                            className="w-full p-2 border border-gray-300 rounded"
                                            value={localMap.episode} onChange={e => setLocalMap({ ...localMap, episode: e.target.value })}
                                        >
                                            <option value="">-- Optional --</option>
                                            {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="bg-gray-50 p-4 rounded border border-gray-200">
                            <label className="block text-sm font-bold text-gray-700 mb-1">Date Seen (Optional)</label>
                            <select
                                className="w-full p-2 border border-gray-300 rounded md:w-1/2"
                                value={localMap.date} onChange={e => setLocalMap({ ...localMap, date: e.target.value })}
                            >
                                <option value="">-- Optional --</option>
                                {headers.map(h => <option key={h} value={h}>{h}</option>)}
                            </select>
                        </div>
                    </div>

                    {sampleRow && (
                        <div className="mt-6 border border-gray-200 rounded-lg overflow-hidden">
                            <div className="bg-gray-100 px-4 py-2 font-bold text-sm text-gray-700 border-b border-gray-200">
                                Data Preview (Row 1)
                            </div>
                            <div className="p-4 bg-white overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <tbody>
                                        {Object.entries(sampleRow).map(([key, val]) => (
                                            <tr key={key} className="border-b last:border-0 border-gray-100">
                                                <td className="py-2 pr-4 font-semibold text-gray-600 whitespace-nowrap">
                                                    {key}
                                                    {key === localMap.title && <span className="ml-2 inline-block px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs">Title</span>}
                                                    {key === localMap.type && <span className="ml-2 inline-block px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">Type</span>}
                                                    {localMap.hasSeries && key === localMap.season && <span className="ml-2 inline-block px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-xs">Season</span>}
                                                    {localMap.hasSeries && key === localMap.episode && <span className="ml-2 inline-block px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-xs">Episode</span>}
                                                    {key === localMap.date && <span className="ml-2 inline-block px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs">Date</span>}
                                                    {key === localMap.scrapeUrlColumn && <span className="ml-2 inline-block px-2 py-0.5 bg-gray-200 text-gray-800 rounded text-xs border border-gray-300">URL</span>}
                                                </td>
                                                <td className="py-2 text-gray-800 truncate max-w-xs">{String(val || '')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-gray-200 flex justify-end gap-2 bg-gray-50 rounded-b-lg">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded font-semibold transition-colors">Cancel</button>
                    <button
                        disabled={!localMap.title && !localMap.scrapeUrlColumn}
                        onClick={handleSave}
                        className="px-6 py-2 bg-[#2ecc71] hover:bg-[#27ae60] text-white rounded font-bold disabled:opacity-50 transition-colors shadow-sm"
                    >
                        Save Mapping
                    </button>
                </div>
            </div>

            {showVisualizer && (
                <ScrapeVisualizerModal
                    baseUrl={localMap.scrapeUrlColumn && sampleRow?.[localMap.scrapeUrlColumn] ? sampleRow[localMap.scrapeUrlColumn] : (localMap.scrapeBaseUrl || '')}
                    initialTitleSelector={localMap.scrapeTitleSelector || ''}
                    initialYearSelector={localMap.scrapeYearSelector || ''}
                    onClose={() => setShowVisualizer(false)}
                    onSave={(titleSelector, yearSelector) => {
                        setLocalMap({ 
                            ...localMap, 
                            scrapeTitleSelector: titleSelector,
                            scrapeYearSelector: yearSelector
                        });
                        setShowVisualizer(false);
                    }}
                />
            )}
        </div>
    );
}
