import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../../App';
import { AppProvider } from '../../contexts/AppContext';

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(), // deprecated
        removeListener: jest.fn(), // deprecated
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
    })),
});

test('renders setup header and structure', () => {
    render(
        <AppProvider>
            <App />
        </AppProvider>
    );
    expect(screen.getAllByText(/MediaVore Translator/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Configure your input and mapping/i)).toBeInTheDocument();
    expect(screen.getByText(/Choose CSV \/ JSON/i)).toBeInTheDocument();
});

test('settings modal opens', () => {
    render(
        <AppProvider>
            <App />
        </AppProvider>
    );

    const settingsBtn = screen.getByText('Settings');
    fireEvent.click(settingsBtn);

    expect(screen.getByText(/TMDB API Key/i)).toBeInTheDocument();
});
