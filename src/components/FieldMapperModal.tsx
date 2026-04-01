import React, { useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { defaultFieldMapping } from '../utils/storage';

export function FieldMapperModal({ fileName, onClose }: { fileName: string, onClose: () => void }) {
    const { parsedFiles, fileMappings, updateFileMapping } = useAppContext();
    const file = parsedFiles.find(f => f.fileName === fileName);
    const headers = file ? file.headers : [];
    
    // We get the current mapping for this specific file, or fallback to default
    const [localMap, setLocalMap] = useState({ ...(fileMappings[fileName] || defaultFieldMapping) });
    const sampleRow = file?.rows?.[0];

    const handleSave = () => {
        updateFileMapping(fileName, localMap);
        onClose();
    };

    const autoSuggest = () => {
        if (!headers.length) return;
        const newMap = { ...localMap };

        const hLower = headers.map(h => h.toLowerCase());

        const findMatch = (patterns: string[]) => {
            for (const p of patterns) {
                const idx = hLower.findIndex(h => h.includes(p));
                if (idx !== -1) return headers[idx];
            }
            return '';
        };

        newMap.title = findMatch(['title', 'name', 'film', 'movie', 'show']);
        newMap.type = findMatch(['type', 'kind', 'media']);
        newMap.season = findMatch(['season']);
        newMap.episode = findMatch(['episode']);
        newMap.date = findMatch(['date', 'seen', 'watched']);

        // Auto-detect series presence
        if (file?.rows.some((r: any) => r[newMap.season] || r[newMap.episode] || r[newMap.type]?.match(/tv|serie/i))) {
            newMap.hasSeries = true;
        }

        setLocalMap(newMap);
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
                            onClick={autoSuggest}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm font-bold transition-colors"
                        >
                            Auto-Suggest
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div className="bg-gray-50 p-4 rounded border border-gray-200">
                            <label className="block text-sm font-bold text-gray-700 mb-1">File Category</label>
                            <select
                                className="w-full p-2 border border-gray-300 rounded md:w-1/2 mb-3"
                                value={localMap.category || ''} onChange={e => setLocalMap({ ...localMap, category: e.target.value })}
                            >
                                <option value="">-- Auto-detect --</option>
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
                                <label className="block text-sm font-bold text-gray-700 mb-1">Title (Required)</label>
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
                        disabled={!localMap.title}
                        onClick={handleSave}
                        className="px-6 py-2 bg-[#2ecc71] hover:bg-[#27ae60] text-white rounded font-bold disabled:opacity-50 transition-colors shadow-sm"
                    >
                        Save Mapping
                    </button>
                </div>
            </div>
        </div>
    );
}
