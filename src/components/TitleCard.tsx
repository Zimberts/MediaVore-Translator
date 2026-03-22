import React, { useState } from 'react';
import { TMDBResult } from '../api/tmdb';

interface TitleCardProps {
    item: { title: string, type: string };
    results?: TMDBResult[] | 'error';
    onConfirm: (match: any) => void;
}

export function TitleCard({ item, results, onConfirm }: TitleCardProps) {
    const [expanded, setExpanded] = useState(false);

    if (results === undefined) {
        return (
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 animate-pulse flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-bold text-gray-800">{item.title}</h3>
                    <span className="text-xs uppercase bg-gray-200 text-gray-600 px-2 py-1 rounded inline-block mt-2">
                        Searching {item.type}...
                    </span>
                </div>
                <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (results === 'error') {
        return (
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <h3 className="text-xl font-bold text-red-800">{item.title}</h3>
                <p className="text-red-600 text-sm mt-1">Failed to fetch results.</p>
            </div>
        );
    }

    if (results.length === 0) {
        return (
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200 flex justify-between items-center">
                <div>
                    <h3 className="text-xl font-bold text-orange-900">{item.title}</h3>
                    <span className="text-xs uppercase bg-orange-200 text-orange-800 px-2 py-1 rounded inline-block mt-2 font-bold">
                        No TMDB Matches
                    </span>
                </div>
                <button
                    onClick={() => onConfirm({ id: -1, name: 'Not Found', title: 'Not Found' })}
                    className="text-sm font-bold text-orange-700 bg-orange-200 px-3 py-1.5 rounded hover:bg-orange-300 transition-colors"
                >
                    Skip Title
                </button>
            </div>
        );
    }

    const matches = expanded ? results : results.slice(0, 3);
    const hasMore = results.length > 3;

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-200 p-3 px-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <h3 className="text-xl font-black text-gray-800 m-0">{item.title}</h3>
                    <span className={`text-xs uppercase px-2 py-0.5 rounded font-bold ${item.type === 'tv' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                        {item.type}
                    </span>
                </div>
                <span className="text-sm text-gray-500 font-medium">Found {results.length} results</span>
            </div>

            <div className="p-4 space-y-4">
                {matches.map(match => (
                    <div key={match.id} className="flex gap-4 p-3 border border-gray-100 rounded-lg hover:border-blue-200 hover:bg-blue-50/30 transition-colors group">
                        {match.poster_path ? (
                            <img
                                src={`https://image.tmdb.org/t/p/w92${match.poster_path}`}
                                alt={match.name}
                                className="w-[60px] h-[90px] object-cover rounded shadow-sm bg-gray-200 flex-shrink-0"
                            />
                        ) : (
                            <div className="w-[60px] h-[90px] bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs text-center flex-shrink-0">
                                No<br />Image
                            </div>
                        )}

                        <div className="flex-1 min-w-0">
                            <h4 className="text-lg font-bold text-gray-800 leading-tight">
                                {match.name}
                                {match.release_date && (
                                    <span className="ml-2 font-normal text-gray-500 text-sm">
                                        ({match.release_date.split('-')[0]})
                                    </span>
                                )}
                            </h4>
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2 leading-snug" title={match.overview}>
                                {match.overview || 'No overview available.'}
                            </p>
                        </div>

                        <div className="flex items-center">
                            <button
                                onClick={() => onConfirm(match)}
                                className="px-4 py-2 bg-blue-100 text-blue-700 hover:bg-blue-600 hover:text-white rounded font-bold text-sm transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 shadow-sm"
                            >
                                Select
                            </button>
                        </div>
                    </div>
                ))}

                {hasMore && !expanded && (
                    <button
                        onClick={() => setExpanded(true)}
                        className="w-full py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold text-sm rounded border border-gray-200 transition-colors"
                    >
                        Show {results.length - 3} more results
                    </button>
                )}
            </div>
        </div>
    );
}
