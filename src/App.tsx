import { useEffect, useState } from 'react';
import { usePollinationsText } from '@pollinations/react';
import ReactMarkdown from 'react-markdown';
import ImageInput from './components/ImageInput';

function App() {
  const [image, setImage] = useState<string | null>(null);
  const [language, setLanguage] = useState<string>('English');
  const [credits, setCredits] = useState<number>(0);
  const [promptKey, setPromptKey] = useState<number>(0);
  const [currentPrompt, setCurrentPrompt] = useState<string>('');

  // Initialize credits from localStorage (100 free credits)
  useEffect(() => {
    try {
      const stored = parseInt(localStorage.getItem('pnpc_credits') || '', 10);
      if (!Number.isFinite(stored) || stored <= 0) {
        localStorage.setItem('pnpc_credits', String(100));
        setCredits(100);
      } else {
        setCredits(stored);
      }
    } catch (e) {
      setCredits(100);
    }
  }, []);

  const updateCredits = (next: number) => {
    const normalized = Math.max(0, Math.floor(next));
    try { localStorage.setItem('pnpc_credits', String(normalized)); } catch (e) { }
    setCredits(normalized);
  };

  // Generate name suggestions using Pollinations
  const namePrompt = image && currentPrompt
    ? `You are a creative pet naming expert. Based on the pet photo and user preferences, suggest 10 unique, memorable pet names in ${language}. Format as a numbered list with brief, engaging explanations for each name.`
    : '';

  const names = usePollinationsText(namePrompt || null as any, {
    seed: promptKey,
    model: 'openai',
  });

  const handleGenerateNames = () => {
    if (!image || credits <= 0) return;
    updateCredits(credits - 1);
    setCurrentPrompt(`Generate pet names`);
    setPromptKey(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-violet-50 via-purple-50 to-indigo-100 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900">

      {/* Animated Header */}
      <header className="sticky top-0 z-10 backdrop-blur-lg bg-white/80 dark:bg-gray-900/80 border-b border-purple-200/50 dark:border-purple-700/50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 animate-fade-in">
              <div className="w-10 h-10 bg-linear-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-2xl">🐾</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-linear-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Pet Name Picker
                </h1>
                <p className="text-xs text-gray-600 dark:text-gray-400">AI-powered • Multilingual • Instant</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-linear-to-r from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30 rounded-full border border-amber-300/50 dark:border-amber-700/50">
                <span className="text-lg">⚡</span>
                <span className="font-semibold text-amber-900 dark:text-amber-100">{credits}</span>
                <span className="text-xs text-amber-700 dark:text-amber-300">credits</span>
              </div>
              <button
                onClick={() => updateCredits(credits + 100)}
                className="px-3 py-1.5 bg-linear-to-r from-purple-600 to-pink-600 text-white text-sm rounded-full font-medium hover:shadow-lg hover:scale-105 transition-all duration-200">
                + 100 Free
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="text-center mb-8 animate-fade-in">
          <h2 className="text-3xl sm:text-5xl font-bold mb-4 bg-linear-to-r from-purple-600 via-pink-600 to-indigo-600 bg-clip-text text-transparent leading-tight">
            Find The Perfect Name<br />For Your Best Friend
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Upload a photo, choose your language, and let AI suggest creative, meaningful names that match your pet's unique personality.
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-purple-100 dark:border-purple-800/50 overflow-hidden">
          <div className="grid md:grid-cols-2 gap-0">

            {/* Left Column - Input */}
            <div className="p-6 sm:p-8 border-r border-gray-200 dark:border-gray-700">
              <div className="space-y-6">

                {/* Language Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <span>🌍</span> Preferred Language
                  </label>
                  <input
                    type="text"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    placeholder="e.g. English, עברית, Español, 日本語, Français"
                    className="w-full px-4 py-3 text-white rounded-xl border-2 border-purple-200 dark:border-purple-700 bg-white dark:bg-gray-900 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 transition-all outline-none"
                  />
                </div>

                {/* Image Upload */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <span>📸</span> Upload Your Pet's Photo
                  </label>
                  <ImageInput
                    className="w-full h-64 rounded-xl border-2 border-dashed border-purple-300 dark:border-purple-600 hover:border-purple-500 transition-all cursor-pointer overflow-hidden"
                    onImageChange={(_file: any, result: string) => {
                      setImage(result);
                      setCurrentPrompt('');
                    }}
                  />
                </div>

                {/* Generate Button */}
                <button
                  onClick={handleGenerateNames}
                  disabled={!image || credits <= 0}
                  className={`w-full py-4 rounded-xl font-semibold text-white text-lg shadow-lg transition-all duration-300 ${!image || credits <= 0
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-linear-to-r from-purple-600 to-pink-600 hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98]'
                    }`}
                >
                  {!image ? '📸 Upload a Photo First' : credits <= 0 ? '⚡ Out of Credits' : names && currentPrompt ? '🔄 Generate Again' : '✨ Generate Names'}
                </button>

                {credits <= 0 && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-300 text-center">
                    Out of credits! Click "+100 Free" above to continue.
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Results */}
            <div className="p-6 sm:p-8 bg-linear-to-br from-purple-50/50 to-pink-50/50 dark:from-purple-900/20 dark:to-pink-900/20">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <span>🎯</span> Name Suggestions
                  </h3>
                  {names && currentPrompt && (
                    <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full">
                      ✓ Generated
                    </span>
                  )}
                </div>

                <div className="min-h-[400px] max-h-[500px] overflow-y-auto rounded-xl bg-white dark:bg-gray-900 border border-purple-200 dark:border-purple-700 p-4">
                  {!image ? (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-3 py-12">
                      <div className="text-6xl mb-4">🐶</div>
                      <p className="text-gray-500 dark:text-gray-400 text-sm">Upload a photo to get started!</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">We'll analyze your pet and suggest perfect names</p>
                    </div>
                  ) : !names || !currentPrompt ? (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-3 py-12">
                      <div className="text-6xl mb-4 animate-bounce">✨</div>
                      <p className="text-gray-600 dark:text-gray-400 font-medium">Ready to generate names!</p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">Click the button to get AI-powered suggestions</p>
                    </div>
                  ) : names ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none animate-fade-in text-white">
                      <ReactMarkdown>{names}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full space-y-3 py-12">
                      <div className="animate-spin text-4xl">🎨</div>
                      <p className="text-gray-600 dark:text-gray-400 font-medium">Generating creative names...</p>
                      <p className="text-xs text-gray-500">This takes just a few seconds</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="mt-12 grid sm:grid-cols-3 gap-6 text-center">
          {[
            { icon: '⚡', title: 'Instant Results', desc: 'Get 10 unique names in seconds' },
            { icon: '🌍', title: 'Any Language', desc: 'Names in your preferred language' },
            { icon: '🎨', title: 'AI-Powered', desc: 'Smart suggestions based on your pet' }
          ].map((feature, i) => (
            <div key={i} className="p-6 bg-white/60 dark:bg-gray-800/60 backdrop-blur rounded-2xl border border-purple-200/50 dark:border-purple-700/50 hover:shadow-lg transition-all">
              <div className="text-4xl mb-3">{feature.icon}</div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-1">{feature.title}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">{feature.desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 py-8 border-t border-purple-200/50 dark:border-purple-700/50 bg-white/50 dark:bg-gray-900/50 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            © {new Date().getFullYear()} Pet Name Picker • Powered by AI • Made with ❤️ for pet lovers
          </p>
        </div>
      </footer>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
      `}</style>
    </div>
  );
}

export default App;
