import { useEffect, useState, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import ImageInput from './components/ImageInput';

function App() {
  const [image, setImage] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [language, setLanguage] = useState<string>('עברית');
  const [credits, setCredits] = useState<number>(0);
  const [promptKey, setPromptKey] = useState<number>(0);
  const [currentPrompt, setCurrentPrompt] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [petDescription, setPetDescription] = useState<string>('');
  const [status, setStatus] = useState<'loading' | 'ready' | 'analyzing'>('loading');
  const [loadProgress, setLoadProgress] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [userFeedback, setUserFeedback] = useState<string>('');
  const [names, setNames] = useState<string | null>(null);
  const [aiModel, setAiModel] = useState<'gemini' | 'openai'>('gemini');

  const worker = useRef<Worker | null>(null);

  // Initialize worker
  useEffect(() => {
    worker.current = new Worker(new URL('./worker.ts', import.meta.url), {
      type: 'module'
    });

    const onMessage = (e: MessageEvent) => {
      const { status: msgStatus, data, result } = e.data;

      switch (msgStatus) {
        case 'loading':
          setStatus('loading');
          setLoadProgress(data || 'Loading vision model...');
          break;
        case 'ready':
          setStatus('ready');
          setLoadProgress('');
          break;
        case 'complete':
          setIsAnalyzing(false);
          if (result && typeof result === 'object' && '<MORE_DETAILED_CAPTION>' in result) {
            setPetDescription(result['<MORE_DETAILED_CAPTION>']);
          }
          break;
      }
    };

    worker.current.addEventListener('message', onMessage);

    // Auto-load model on mount
    worker.current.postMessage({ type: 'load' });

    return () => {
      worker.current?.removeEventListener('message', onMessage);
      worker.current?.terminate();
    };
  }, []);

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

  // Analyze image when it changes or when model becomes ready
  useEffect(() => {
    if (image && status === 'ready' && !petDescription && !isAnalyzing) {
      setIsAnalyzing(true);
      worker.current?.postMessage({
        type: 'run',
        data: {
          url: image,
          task: '<MORE_DETAILED_CAPTION>',
        }
      });
    }
  }, [image, status, petDescription, isAnalyzing]);

  // Generate names with manual fetch when promptKey changes
  useEffect(() => {
    if (!petDescription || !currentPrompt || promptKey === 0) return;

    const generateNames = async () => {
      try {
        const userContent = `Based on this pet: "${petDescription}"${userFeedback ? `. User feedback: "${userFeedback}"` : ''}. Suggest exactly 10 pet names in ${language}. Format:
1. Name - one sentence why
2. Name - one sentence why
(etc.)
Be concise. No introduction or conclusion.`;

        const response = await fetch('https://text.pollinations.ai/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [
              {
                role: 'system',
                content: 'You are a helpful pet naming assistant. Provide only the requested names list. Do not include any advertisements, promotional content, or mentions of Pollinations.AI.'
              },
              {
                role: 'user',
                content: userContent
              }
            ],
            seed: promptKey,
            model: aiModel,
            jsonMode: false
          })
        });

        const text = await response.text();
        setNames(text);
        setIsGenerating(false);
      } catch (error) {
        console.error('Error generating names:', error);
        setIsGenerating(false);
      }
    };

    generateNames();
  }, [promptKey, petDescription, currentPrompt]);

  const handleGenerateNames = useCallback(() => {
    if (!image || credits <= 0 || !petDescription) return;
    updateCredits(credits - 1);
    setIsGenerating(true);
    setNames(null); // Clear old names
    setCurrentPrompt(`Generate pet names`);
    setPromptKey(prev => prev + 1);
  }, [image, credits, petDescription]);

  // Detect RTL for Hebrew
  const isRTL = language.toLowerCase().includes('עברית') || language.toLowerCase().includes('hebrew') || language.toLowerCase() === 'he';

  return (
    <div className="min-h-screen bg-linear-to-br from-violet-50 via-purple-50 to-indigo-100 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900">

      {/* Model Loading Banner */}
      {status === 'loading' && (
        <div className="bg-blue-600 text-white px-4 py-2 text-center text-sm flex items-center justify-center gap-3">
          <div className="animate-spin text-lg">⚙️</div>
          <span>{loadProgress}</span>
        </div>
      )}

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
              <a
                href="https://www.youtube.com/@BurgilBuilds"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full border border-red-200 dark:border-red-800 transition-all hover:scale-105"
                title="BurgilBuilds on YouTube"
              >
                <span className="text-lg">▶️</span>
                <span className="text-xs font-medium text-red-700 dark:text-red-300">YouTube</span>
              </a>
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-linear-to-r from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30 rounded-full border border-amber-300/50 dark:border-amber-700/50">
                <span className="text-lg">⚡</span>
                <span className="font-semibold text-amber-900 dark:text-amber-100">{credits}</span>
                <span className="text-xs text-amber-700 dark:text-amber-300">credits</span>
              </div>
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

                {/* AI Model Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <span>🤖</span> AI Model
                  </label>
                  <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-900 rounded-xl border-2 border-purple-200 dark:border-purple-700">
                    <button
                      onClick={() => setAiModel('gemini')}
                      className={`flex-1 py-2 px-3 rounded-lg font-medium transition-all ${
                        aiModel === 'gemini'
                          ? 'bg-purple-600 text-white shadow-lg'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      AI 1
                    </button>
                    <button
                      onClick={() => setAiModel('openai')}
                      className={`flex-1 py-2 px-3 rounded-lg font-medium transition-all ${
                        aiModel === 'openai'
                          ? 'bg-purple-600 text-white shadow-lg'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      AI 2
                    </button>
                  </div>
                </div>

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
                  <div className="relative">
                    <ImageInput
                      imagePreview={imagePreview}
                      setImagePreview={setImagePreview}
                      className="w-full h-64 rounded-xl border-2 border-dashed border-purple-300 dark:border-purple-600 hover:border-purple-500 transition-all cursor-pointer overflow-hidden"
                      onImageChange={(_file: any, result: string) => {
                        worker.current?.postMessage({ type: 'reset' }); // Reset image cache
                        setImage(result);
                        setPetDescription(''); // Clear old description immediately
                        setCurrentPrompt(''); // Clear prompt to stop name generation
                        setUserFeedback(''); // Clear feedback
                        setPromptKey(0); // Reset prompt key to prevent generation
                      }}
                    />
                    {status === 'loading' && (
                      <div className="absolute inset-0 bg-white/90 dark:bg-gray-900/90 rounded-xl flex flex-col items-center justify-center gap-3 backdrop-blur-sm">
                        <div className="w-16 h-16 rounded-full bg-linear-to-r from-purple-200 to-pink-200 dark:from-purple-800 dark:to-pink-800 animate-pulse"></div>
                        <div className="w-32 h-3 bg-purple-200 dark:bg-purple-800 rounded animate-pulse"></div>
                        <div className="w-24 h-3 bg-pink-200 dark:bg-pink-800 rounded animate-pulse"></div>
                      </div>
                    )}
                  </div>
                  {image && (
                    <button
                      onClick={() => {
                        worker.current?.postMessage({ type: 'reset' });
                        setImage(null);
                        setImagePreview(null);
                        setPetDescription('');
                        setCurrentPrompt('');
                        setUserFeedback('');
                        setPromptKey(0);
                        setNames(null);
                      }}
                      className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 underline"
                    >
                      📸 Upload another photo
                    </button>
                  )}
                </div>

                {/* Vision Analysis Status */}
                {image && isAnalyzing && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl text-sm text-blue-700 dark:text-blue-300 text-center flex items-center justify-center gap-2">
                    <div className="animate-spin text-lg">🔍</div>
                    <span>Analyzing your pet's photo...</span>
                  </div>
                )}

                {/* Pet Description Preview */}
                {petDescription && !isAnalyzing && (
                  <div className="p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl text-sm text-purple-700 dark:text-purple-300">
                    <div className="font-semibold mb-1 flex items-center gap-2">
                      <span>👁️</span> Vision AI sees:
                    </div>
                    <p className="text-xs opacity-90">{petDescription}</p>
                  </div>
                )}

                {/* Generate Button */}
                <button
                  onClick={handleGenerateNames}
                  disabled={!image || credits <= 0 || isAnalyzing || !petDescription}
                  className={`w-full py-4 rounded-xl font-semibold text-white text-lg shadow-lg transition-all duration-300 ${!image || credits <= 0 || isAnalyzing || !petDescription
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-linear-to-r from-purple-600 to-pink-600 hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98]'
                    }`}
                >
                  {!image ? '📸 Upload a Photo First' :
                    status === 'loading' ? '⏳ Loading AI Model...' :
                      isAnalyzing ? '🔍 Analyzing Photo...' :
                        !petDescription ? '⏳ Analyzing...' :
                          credits <= 0 ? '⚡ Out of Credits' :
                            isGenerating ? '🎨 Generating Names...' :
                              names && currentPrompt ? '🔄 Generate Again' : '✨ Generate Names'}
                </button>

                {credits <= 0 && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-300 text-center">
                    Out of credits!
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
                  ) : isAnalyzing ? (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-3 py-12">
                      <div className="animate-spin text-6xl mb-4">🔍</div>
                      <p className="text-gray-600 dark:text-gray-400 font-medium">Analyzing your pet...</p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">Vision AI is examining the photo</p>
                    </div>
                  ) : !petDescription ? (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-3 py-12">
                      <div className="text-6xl mb-4 animate-bounce">✨</div>
                      <p className="text-gray-600 dark:text-gray-400 font-medium">Upload a photo to begin!</p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">AI will analyze your pet's unique features</p>
                    </div>
                  ) : isGenerating || (currentPrompt && !names) ? (
                    <div className="flex flex-col items-center justify-center h-full space-y-3 py-12">
                      <div className="animate-spin text-6xl mb-4">🎨</div>
                      <p className="text-gray-600 dark:text-gray-400 font-medium">Generating creative names...</p>
                      <p className="text-xs text-gray-500">AI is crafting perfect suggestions for your pet</p>
                      <div className="mt-4 flex gap-2">
                        <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  ) : !currentPrompt ? (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-3 py-12">
                      <div className="text-6xl mb-4 animate-bounce">✨</div>
                      <p className="text-gray-600 dark:text-gray-400 font-medium">Ready to generate names!</p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">Click the button to get AI-powered suggestions</p>
                    </div>
                  ) : (
                    <div className="prose prose-sm dark:prose-invert max-w-none animate-fade-in text-white" dir={isRTL ? 'rtl' : 'ltr'}>
                      <ReactMarkdown>{names}</ReactMarkdown>
                    </div>
                  )}
                </div>

                {/* User Feedback Input - Outside scrollable area */}
                {names && currentPrompt && (
                  <div className="space-y-2 pt-4" dir={isRTL ? 'rtl' : 'ltr'}>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <span>💭</span> Guide the AI (optional)
                    </label>
                    <textarea
                      value={userFeedback}
                      onChange={(e) => setUserFeedback(e.target.value)}
                      placeholder="e.g., 'shorter names', 'more playful', 'related to mythology'..."
                      className="w-full px-3 py-2 rounded-lg border-2 border-purple-200 dark:border-purple-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all outline-none resize-none"
                      rows={2}
                    />
                    <button
                      onClick={handleGenerateNames}
                      disabled={isGenerating || credits <= 0}
                      className="w-full py-2 px-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg transition-all disabled:cursor-not-allowed"
                    >
                      {isGenerating ? '🎨 Refining...' : '🔄 Refine Names'}
                    </button>
                  </div>
                )}
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
        <div className="max-w-6xl mx-auto px-4 text-center space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            © {new Date().getFullYear()} Pet Name Picker • Powered by AI • Made with ❤️ for pet lovers
          </p>
          <div className="flex items-center justify-center gap-2">
            <a
              href="https://www.youtube.com/@BurgilBuilds"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-full transition-all hover:scale-105 shadow-md hover:shadow-lg"
            >
              <span className="text-lg">▶️</span>
              <span>Watch @BurgilBuilds on YouTube</span>
            </a>
          </div>
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
