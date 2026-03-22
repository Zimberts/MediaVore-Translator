import React, { useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { clearLocalCaches } from '../api/tmdb';

export function SettingsModal({ onClose }: { onClose: () => void }) {
    const { apiKey, updateApiKey, autoConfirm, setAutoConfirm, clearConfirmedMap } = useAppContext();
    const [localKey, setLocalKey] = useState(apiKey);

    const handleSave = () => {
        updateApiKey(localKey);
        onClose();
    };

    const handleClearCache = () => {
        if (window.confirm("Clear all TMDB caches and confirmed mappings? This cannot be undone.")) {
            clearLocalCaches();
            clearConfirmedMap();
            alert("Caches cleared.");
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-lg">
                    <h2 className="text-xl font-bold m-0 text-gray-800">Settings</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 font-bold text-xl leading-none">&times;</button>
                </div>

                <div className="p-6 space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">TMDB API Key</label>
                        <input
                            type="password"
                            value={localKey}
                            onChange={e => setLocalKey(e.target.value)}
                            placeholder="Enter v3 API Key"
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">Required to search titles. Keys are saved locally.</p>
                    </div>

                    <div className="pt-4 border-t border-gray-200">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={autoConfirm}
                                onChange={e => setAutoConfirm(e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded"
                            />
                            <span className="font-bold text-gray-700">Auto-confirm distinct matches</span>
                        </label>
                        <p className="text-xs text-gray-500 mt-1 ml-6">Automatically accept matches when TMDB returns exactly one result.</p>
                    </div>

                    <div className="pt-4 border-t border-gray-200">
                        <h3 className="text-sm font-bold text-gray-700 mb-2">Data Management</h3>
                        <button
                            onClick={handleClearCache}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 px-3 py-1.5 rounded text-sm font-bold transition-colors w-full text-left border border-red-200"
                        >
                            Clear TMDB Cache & Map
                        </button>
                    </div>
                </div>

                <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-2 rounded-b-lg">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded font-semibold transition-colors">Cancel</button>
                    <button onClick={handleSave} className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded font-bold transition-colors shadow-sm">Save</button>
                </div>
            </div>
        </div>
    );
}
