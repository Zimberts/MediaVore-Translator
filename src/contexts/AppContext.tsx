import React, { createContext, useContext, useState, ReactNode } from 'react';
import { FieldMapping, getMapping, saveMapping } from '../utils/storage';
import { loadConfirmedMap, saveConfirmedMap, getApiKey, setApiKey } from '../api/tmdb';

interface ParsedFile {
    fileName: string;
    headers: string[];
    rows: Record<string, any>[];
}

interface AppState {
    parsedFile: ParsedFile | null;
    setParsedFile: (file: ParsedFile | null) => void;

    mapping: FieldMapping;
    updateMapping: (newMap: FieldMapping) => void;

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
    const [parsedFile, setParsedFile] = useState<ParsedFile | null>(null);
    const [mapping, setMappingState] = useState<FieldMapping>(getMapping());
    const [confirmedMap, setConfirmedMap] = useState<Record<string, any>>(loadConfirmedMap());
    const [apiKey, setApiKeyState] = useState<string>(getApiKey());

    const [autoConfirm, setAutoConfirmState] = useState<boolean>(() => {
        return localStorage.getItem('mediavore_auto_confirm') === '1';
    });

    const updateMapping = (newMap: FieldMapping) => {
        saveMapping(newMap);
        setMappingState(newMap);
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
            parsedFile, setParsedFile,
            mapping, updateMapping,
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
