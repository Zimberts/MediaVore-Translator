import React, { useState } from 'react';
import { useAppContext } from './contexts/AppContext';
import { SetupPanel } from './components/SetupPanel';
import { SettingsModal } from './components/SettingsModal';
import { MatchContainer } from './components/MatchContainer';

function App() {
  const { parsedFiles } = useAppContext();
  const [showSettings, setShowSettings] = useState(false);
  const [currentStep, setCurrentStep] = useState<'setup' | 'match'>('setup');

  const handleFinishSetup = () => {
    setCurrentStep('match');
  };

  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset everything? Your mappings and TMDB cache will not be lost unless you clear them in settings.")) {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900 font-sans">
      <header className="bg-[#2c3e50] text-[#f2f2f2] p-4 text-center border-b-[5px] border-[#3498db] shadow-md">
        <h1 className="m-0 text-2xl font-bold tracking-wider">MediaVore Translator</h1>
        <p className="text-sm mt-1 opacity-90">Convert Letterboxd / Trakt logs to TMDB JSON</p>
      </header>

      <main className="flex-1 p-5 max-w-5xl w-full mx-auto">
        <div className="bg-[#34495e] text-white p-3 rounded-md mb-6 flex justify-between items-center shadow">
          {currentStep === 'setup' && (
            <div>Configure your input and mapping</div>
          )}
          {currentStep === 'match' && (
            <div>
              <button
                className="bg-gray-200 text-gray-800 border-none px-4 py-2 rounded text-sm font-bold cursor-pointer hover:bg-white transition-colors"
                onClick={() => setCurrentStep('setup')}
              >
                &larr; Back to Setup
              </button>
            </div>
          )}

          <div className="flex gap-2">
            <button
              className="bg-transparent border border-white text-white px-3 py-1 rounded text-sm font-bold hover:bg-white/20 transition-colors"
              onClick={() => setShowSettings(true)}
            >
              Settings
            </button>
            {currentStep !== 'setup' && (
              <button
                className="bg-[#e74c3c] border-none text-white px-3 py-1 rounded text-sm font-bold hover:bg-[#c0392b] transition-colors"
                onClick={handleReset}
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {currentStep === 'setup' && (
          <SetupPanel onFinish={handleFinishSetup} />
        )}

        {currentStep === 'match' && parsedFiles.length > 0 ? (
          <MatchContainer />
        ) : null}
      </main>

      <footer className="text-center p-4 text-xs text-gray-500 bg-white border-t border-gray-200 mt-auto">
        MediaVore Translator &copy; 2026. Local processing only.
      </footer>

      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}

export default App;
