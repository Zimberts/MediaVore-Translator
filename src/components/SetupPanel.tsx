import React, { useRef, useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { parseByFilename, parseZipContent, autoSuggestMapping } from '../utils/parsers';
import { defaultFieldMapping } from '../utils/storage';
import { FieldMapperModal } from './FieldMapperModal';

export function SetupPanel({ onFinish }: { onFinish: () => void }) {
    const { parsedFiles, setParsedFiles, removeFile, fileMappings, updateFileMapping } = useAppContext();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [mappingFile, setMappingFile] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        setError(null);

        const newParsedFiles: typeof parsedFiles = [];
        let hasError = false;

        for (const file of files) {
            try {
                if (file.name.toLowerCase().endsWith('.zip') || file.name.toLowerCase().endsWith('.mdv')) {
                    const zipFiles = await parseZipContent(file);
                    for (const zf of zipFiles) {
                        newParsedFiles.push({
                            fileName: `${file.name}/${zf.fileName}`,
                            headers: zf.headers,
                            rows: zf.rows,
                            category: zf.fileName
                        });
                    }
                } else {
                    const text = await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = (evt) => resolve(evt.target?.result as string);
                        reader.onerror = () => reject(new Error('Failed to read file'));
                        reader.readAsText(file);
                    });

                    const rows = parseByFilename(file.name, text);
                    if (rows && rows.length > 0) {
                        const headers = Object.keys(rows[0]);
                        newParsedFiles.push({ fileName: file.name, headers, rows, category: file.name });
                    }
                }
            } catch (err: any) {
                console.error(`Failed to file ${file.name}: ${err.message}`);
                hasError = true;
            }
        }

        if (newParsedFiles.length === 0) {
            setError('No valid data found in selected files.');
        } else {
            if (hasError) setError('Some files failed to parse.');

            // Try to set some default mappings using common strategies for new files!
            const addedFiles = [...parsedFiles, ...newParsedFiles];
            const totalRowsInAllFiles: Record<string, number> = {};

            // Build map of file sizes (row counts) across all existing and new files
            for (const file of addedFiles) {
                totalRowsInAllFiles[file.fileName] = file.rows.length;
            }

            for (const newFile of newParsedFiles) {
                const existingMap = fileMappings[newFile.fileName];
                    const suggestion = autoSuggestMapping(newFile.headers, newFile.rows, totalRowsInAllFiles);
                    
                    const finalMapping = { 
                        ...defaultFieldMapping, 
                        ...suggestion 
                    };
                    
                    if (existingMap) {
                        for (const key of Object.keys(existingMap)) {
                            // @ts-ignore
                            if (existingMap[key] !== '' && existingMap[key] !== null && existingMap[key] !== undefined) {
                                // @ts-ignore
                                finalMapping[key] = existingMap[key];
                            }
                        }
                    }

                    updateFileMapping(newFile.fileName, finalMapping as any);

                    if (existingMap?.category) {
                        newFile.category = existingMap.category;
                    } else if (suggestion.category) {
                        newFile.category = suggestion.category as string;
                    }
                }

            setParsedFiles(addedFiles);
        }
    };

    const isMappingValid = parsedFiles.length > 0 && parsedFiles.every(f => fileMappings[f.fileName]?.title || fileMappings[f.fileName]?.scrapeUrlColumn);

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span className="bg-[#3498db] text-white w-6 h-6 inline-flex justify-center items-center rounded-full text-sm">1</span>
                Data Setup
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h3 className="text-lg font-semibold border-b border-gray-200 pb-2 mb-3">Input File</h3>
                    <div className="mb-4">
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept=".csv,.json,.yaml,.yml,.zip,.mdv"
                            multiple
                            onChange={handleFileChange}
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-[#2ecc71] hover:bg-[#27ae60] text-white px-4 py-2 flex rounded font-bold cursor-pointer transition-colors"
                        >
                            Choose CSV / JSON / ZIP / MDV
                        </button>
                        {parsedFiles.length > 0 && (
                            <div className="mt-2 text-sm text-gray-600 bg-gray-100 p-3 rounded inline-block w-full">
                                Loaded {parsedFiles.length} file(s):
                                <ul className="list-disc pl-5 mt-2 space-y-1">
                                    {parsedFiles.map(pf => (
                                        <li key={pf.fileName} className="flex items-center gap-2">
                                            <span>
                                                <span className="font-semibold">{pf.fileName}</span> ({pf.rows.length} rows)
                                                {!fileMappings[pf.fileName]?.title && !fileMappings[pf.fileName]?.scrapeUrlColumn && (
                                                    <span className="ml-2 text-red-500 font-semibold">[Needs Mapping]</span>
                                                )}
                                            </span>
                                            <button
                                                onClick={() => removeFile(pf.fileName)}
                                                className="text-xs text-red-500 hover:text-red-700 bg-red-100 hover:bg-red-200 px-2 py-0.5 rounded transition-colors"
                                                title={`Remove ${pf.fileName}`}
                                            >
                                                Skip / Remove
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-semibold border-b border-gray-200 pb-2 mb-3">Field Mapping</h3>
                    {parsedFiles.length > 0 ? (
                        <div className="space-y-4 max-h-[16rem] overflow-y-auto pr-2">
                            {parsedFiles.map((file) => {
                                const map = fileMappings[file.fileName];
                                const isMapped = !!map?.title || !!map?.scrapeUrlColumn;

                                return (
                                    <div key={file.fileName} className="bg-gray-50 border border-gray-200 p-4 rounded-md">
                                        <div className="font-semibold mb-2 text-gray-800 break-all">{file.fileName}</div>
                                        {isMapped ? (
                                            <div className="text-sm space-y-1 mb-3">
                                                {(() => {
                                                    const preview = (col: string | undefined) => {
                                                        if (!col) return <span className="text-gray-400">Not set</span>;
                                                        const val = file.rows[0]?.[col];
                                                        const valStr = typeof val === 'string' ? val : String(val || '');
                                                        return <span><span className="text-green-700 font-semibold">"{valStr.length > 50 ? valStr.substring(0, 50) + '...' : valStr}"</span> <span className="text-gray-400 text-xs">({col})</span></span>;
                                                    };
                                                    return (
                                                        <>
                                                            <div><span className="font-bold w-20 inline-block">Title:</span> {preview(map.title)}</div>
                                                            {(map.scrapeUrlColumn || map.scrapeBaseUrl) && (
                                                                <div>
                                                                    <span className="font-bold w-20 inline-block">URL:</span> 
                                                                    {map.scrapeUrlColumn ? preview(map.scrapeUrlColumn) : <span className="text-gray-600">Base URL matching ID</span>}
                                                                </div>
                                                            )}
                                                            <div><span className="font-bold w-20 inline-block">Type:</span> {preview(map.type)}</div>
                                                            {map.hasSeries && (
                                                                <>
                                                                    <div><span className="font-bold w-20 inline-block">Season:</span> {preview(map.season)}</div>
                                                                    <div><span className="font-bold w-20 inline-block">Episode:</span> {preview(map.episode)}</div>
                                                                </>
                                                            )}
                                                            <div><span className="font-bold w-20 inline-block">Date:</span> {preview(map.date)}</div>
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        ) : (
                                            <div className="text-sm text-red-500 mb-3 font-semibold">No mapping set</div>
                                        )}
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setMappingFile(file.fileName)}
                                                className="bg-[#3498db] hover:bg-[#2980b9] text-white px-3 py-1.5 rounded text-sm font-bold cursor-pointer transition-colors"
                                            >
                                                {isMapped ? 'Edit Mapping' : 'Configure Mapping'}
                                            </button>
                                            <button
                                                onClick={() => removeFile(file.fileName)}
                                                className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-3 py-1.5 rounded text-sm font-bold cursor-pointer transition-colors"
                                            >
                                                Remove File
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-gray-500 italic text-sm">Please load a file first</p>
                    )}
                </div>
            </div>

            <div className="mt-8 pt-4 border-t border-gray-200 flex justify-end">
                <button
                    disabled={!isMappingValid}
                    onClick={onFinish}
                    className={`px-6 py-2 rounded font-bold text-lg transition-colors ${!isMappingValid
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-[#9b59b6] hover:bg-[#8e44ad] text-white cursor-pointer shadow-sm'
                        }`}
                >
                    Begin Processing &rarr;
                </button>
            </div>

            {mappingFile && (
                <FieldMapperModal fileName={mappingFile} onClose={() => setMappingFile(null)} />
            )}
        </div>
    );
}
