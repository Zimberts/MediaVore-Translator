import React, { useState, KeyboardEvent } from 'react';
import { TMDBResult } from '../api/tmdb';

interface TitleCardProps {
    onManualSearch?: (newSearch: { title: string, year?: string, type: string }) => void;
    customQuery?: {title: string, year?: string, type: string};
    item: { title: string, type: string };
    sourceUrl?: string;
    results?: TMDBResult[] | 'error' | 'scrape_error';
    onConfirm: (match: any) => void;
}

export function TitleCard({ item, results, onConfirm, onManualSearch, customQuery, sourceUrl }: TitleCardProps) {
    const [expanded, setExpanded] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    
    // Use customQuery values if provided, otherwise fallback to item values
    const currentTitle = customQuery?.title || item.title;
    const currentYear = customQuery?.year || '';
    const currentType = customQuery?.type || item.type;

    const [editTitle, setEditTitle] = useState(currentTitle);
    const [editYear, setEditYear] = useState(currentYear);
    const [editType, setEditType] = useState(currentType);

    const handleSearch = () => {
        if (editTitle.trim()) {
            if (onManualSearch) {
                onManualSearch({ title: editTitle.trim(), year: editYear.trim(), type: editType });
            }
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleSearch();
        if (e.key === 'Escape') {
            setEditTitle(currentTitle);
            setEditYear(currentYear);
            setEditType(currentType);
            setIsEditing(false);
        }
    };

    const renderHeaderTitle = () => {
        if (isEditing) {
            return (
                <div className="flex-1 flex gap-2 items-center mr-4 w-full">
                    <input
                        type="text"
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm font-bold w-full"
                        placeholder="Title"
                        autoFocus
                    />
                    <input
                        type="text"
                        value={editYear}
                        onChange={e => setEditYear(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="w-20 px-3 py-1.5 border border-gray-300 rounded text-sm placeholder-gray-400"
                        placeholder="Year"
                    />
                    <select
                        value={editType}
                        onChange={e => setEditType(e.target.value)}
                        className="w-24 px-2 py-1.5 border border-gray-300 rounded text-sm font-bold bg-white"
                    >
                        <option value="movie">Movie</option>
                        <option value="tv">TV</option>
                    </select>
                    <button
                        onClick={handleSearch}
                        className="px-4 py-1.5 bg-blue-600 text-white rounded font-bold text-sm shadow-sm hover:bg-blue-700"
                    >
                        Search
                    </button>
                    <button
                        onClick={() => {
                            setEditTitle(currentTitle);
                            setEditYear(currentYear);
                            setEditType(currentType);
                            setIsEditing(false);
                        }}
                        className="px-4 py-1.5 text-gray-500 hover:bg-gray-200 rounded font-bold text-sm"
                    >
                        Cancel
                    </button>
                </div>
            );
        }

        const isUrl = item.title.startsWith('http://') || item.title.startsWith('https://');

        return (
            <div className="flex flex-col gap-1 w-full mr-4">
                <div className="flex items-center gap-3">
                    <h3 className="text-xl font-black text-gray-800 m-0">
                        {currentTitle}
                    </h3>
                    <span className={`text-xs uppercase px-2 py-0.5 rounded font-bold ${currentType === 'tv' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                        {currentType}
                    </span>
                    {currentYear && (
                        <span className="text-xs px-2 py-0.5 rounded font-bold bg-gray-200 text-gray-700">
                            {currentYear}
                        </span>
                    )}
                    <button
                        onClick={() => {
                            setEditTitle(currentTitle);
                            setEditYear(currentYear);
                            setEditType(currentType);
                            setIsEditing(true);
                        }}
                        className="p-1 px-2 hover:bg-gray-200 text-gray-400 hover:text-gray-700 rounded text-xs font-bold transition-colors ml-2"
                    >
                        Edit Search
                    </button>
                    {(sourceUrl || isUrl) && (
                        <a 
                            href={sourceUrl || item.title} 
                            target="_blank" 
                            rel="noreferrer"
                            className="p-1 px-2 hover:bg-gray-200 text-blue-500 hover:text-blue-700 rounded text-xs font-bold transition-colors flex items-center gap-1"
                            title="View source page"
                        >
                            ↗ View Page
                        </a>
                    )}
                </div>
                {currentTitle !== item.title && (
                    <div className={`text-gray-400 font-normal ${isUrl ? 'text-[10px] break-all w-full max-w-[500px] opacity-50 hover:opacity-100 transition-opacity cursor-help' : 'text-xs'}`} title={isUrl ? "Original URL" : "Original Title"}>
                        (Original: {item.title})
                    </div>
                )}
            </div>
        );
    };


    if (results === undefined) {
        return (
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 animate-pulse flex items-center justify-between">
                <div className="w-full mr-4">
                    {renderHeaderTitle()}
                    <span className="text-xs uppercase bg-gray-200 text-gray-600 px-2 py-1 rounded inline-block mt-2">
                        Searching {currentType}...
                    </span>
                </div>
                <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (results === 'error') {
        return (
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <div className="w-full mr-4">{renderHeaderTitle()}</div>
                <p className="text-red-600 text-sm mt-1 font-bold">Failed to search TMDB results.</p>
            </div>
        );
    }

    if (results === 'scrape_error') {
        return (
            <div className="bg-red-50 p-4 rounded-lg border border-red-200 flex justify-between items-center">
                <div className="w-full mr-4">
                    {renderHeaderTitle()}
                    <span className="text-xs uppercase bg-red-200 text-red-800 px-2 py-1 rounded inline-block mt-2 font-bold">
                        Failed to Scrape Website
                    </span>
                    <p className="text-red-600 text-xs mt-1">The URL could not be crawled or no title was found.</p>
                </div>
            </div>
        );
    }

    if (results.length === 0) {
        return (
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200 flex justify-between items-center">
                <div className="w-full mr-4">
                    {renderHeaderTitle()}
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
                {renderHeaderTitle()}
                {!isEditing && <span className="text-sm text-gray-500 font-medium whitespace-nowrap">Found {results.length} results</span>}
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
