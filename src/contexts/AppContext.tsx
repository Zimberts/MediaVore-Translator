import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { FieldMapping, getFileMappings, saveFileMappings } from '../utils/storage';
import { loadConfirmedMap, saveConfirmedMap, getApiKey, setApiKey } from '../api/tmdb';

interface ParsedFile {
    fileName: string;
    headers: string[];
    rows: Record<string, any>[];
    category?: string;
}

interface AppState {
    parsedFiles: ParsedFile[];
    setParsedFiles: (files: ParsedFile[]) => void;
    removeFile: (fileName: string) => void;

    fileMappings: Record<string, FieldMapping>;
    updateFileMapping: (fileName: string, newMap: FieldMapping) => void;

    confirmedMap: Record<string, any>;
    confirmMatch: (title: string, match: any) => void;
    clearConfirmedMap: () => void;
    importConfirmed: (map: Record<string, any>) => void;

    apiKey: string;
    updateApiKey: (key: string) => void;

    autoConfirm: boolean;
    setAutoConfirm: (val: boolean) => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
    const [parsedFiles, setParsedFiles] = useState<ParsedFile[]>([]);
    const [fileMappings, setFileMappingsState] = useState<Record<string, FieldMapping>>({});
    const [confirmedMap, setConfirmedMap] = useState<Record<string, any>>(loadConfirmedMap());
    const [apiKey, setApiKeyState] = useState<string>(getApiKey());

    const [autoConfirm, setAutoConfirmState] = useState<boolean>(() => {
        return localStorage.getItem('mediavore_auto_confirm') === '1';
    });

    useEffect(() => {
        setFileMappingsState(getFileMappings());
    }, []);

    const updateFileMapping = (fileName: string, newMap: FieldMapping) => {
        const next = { ...fileMappings, [fileName]: newMap };
        saveFileMappings(next);
        setFileMappingsState(next);
    };

    const removeFile = (fileName: string) => {
        setParsedFiles(prev => prev.filter(f => f.fileName !== fileName));
        const nextMappings = { ...fileMappings };
        delete nextMappings[fileName];
        saveFileMappings(nextMappings);
        setFileMappingsState(nextMappings);
    };

    const confirmMatch = (title: string, match: any) => {
        setConfirmedMap(prev => {
            const next = { ...prev, [title]: match };
            saveConfirmedMap(next);
            return next;
        });
    };

    const clearConfirmedMap = () => {
        setConfirmedMap({});
        saveConfirmedMap({});
    };

    const importConfirmed = (map: Record<string, any>) => {
        setConfirmedMap(prev => {
            const next = { ...prev, ...map };
            saveConfirmedMap(next);
            return next;
        });
    };

    const updateApiKey = (key: string) => {
        setApiKey(key);
        setApiKeyState(key);
    };

    const setAutoConfirm = (val: boolean) => {
        localStorage.setItem('mediavore_auto_confirm', val ? '1' : '0');
        setAutoConfirmState(val);
    };

    return (
        <AppContext.Provider value={{
            parsedFiles, setParsedFiles, removeFile,
            fileMappings, updateFileMapping,
            confirmedMap, confirmMatch, clearConfirmedMap, importConfirmed,
            apiKey, updateApiKey,
            autoConfirm, setAutoConfirm
        }}>
            {children}
        </AppContext.Provider>
    );
}

export function useAppContext() {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
}
