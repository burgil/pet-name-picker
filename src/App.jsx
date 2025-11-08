import { useEffect, useState, useRef, useCallback } from 'react';

import Progress from './components/Progress';
import ImageInput from './components/ImageInput';

const IS_WEBGPU_AVAILABLE = !!navigator.gpu;

function App() {

  // Create a reference to the worker object.
  const worker = useRef(null);

  // Model loading and progress
  const [status, setStatus] = useState(null);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [progressItems, setProgressItems] = useState([]);

  const [task, setTask] = useState('<MORE_DETAILED_CAPTION>');
  const [text, setText] = useState('');
  const [image, setImage] = useState(null);
  const [result, setResult] = useState(null);
  const [time, setTime] = useState(null);
  const [language, setLanguage] = useState('English');
  const [prompt, setPrompt] = useState('');
  const [conversation, setConversation] = useState([]);

  // We use the `useEffect` hook to setup the worker as soon as the `App` component is mounted.
  useEffect(() => {
    if (!worker.current) {
      // Create the worker if it does not yet exist.
      worker.current = new Worker(new URL('./worker.ts', import.meta.url), {
        type: 'module'
      });
    }

    // Create a callback function for messages from the worker thread.
    const onMessageReceived = (e) => {
      switch (e.data.status) {
        case 'loading':
          // Model file start load: add a new progress item to the list.
          setStatus('loading');
          setLoadingMessage(e.data.data);
          break;

        case 'initiate':
          setProgressItems(prev => [...prev, e.data]);
          break;

        case 'progress':
          // Model file progress: update one of the progress items.
          setProgressItems(
            prev => prev.map(item => {
              if (item.file === e.data.file) {
                return { ...item, ...e.data }
              }
              return item;
            })
          );
          break;

        case 'done':
          // Model file loaded: remove the progress item from the list.
          setProgressItems(
            prev => prev.filter(item => item.file !== e.data.file)
          );
          break;

        case 'ready':
          // Pipeline ready: the worker is ready to accept messages.
          setStatus('ready');
          break;

        case 'complete':
          setResult(e.data.result);
          setTime(e.data.time);
          setStatus('ready');
          break;
      }
    };

    // Attach the callback function as an event listener.
    worker.current.addEventListener('message', onMessageReceived);

    // Define a cleanup function for when the component is unmounted.
    return () => {
      worker.current.removeEventListener('message', onMessageReceived);
    };
  }, []);

  const handleLoadModel = useCallback(() => {
    if (status === null) {
      setStatus('loading');
      worker.current.postMessage({ type: 'load' });
    }
  }, [status]);

  const handleAsk = useCallback((extraPrompt = null) => {
    if (!image) return;
    const newPrompt = extraPrompt ?? prompt;
    if (!newPrompt) return;

    // Append to conversation
    const nextConversation = [...conversation, newPrompt];
    setConversation(nextConversation);
    setPrompt('');
    setStatus('running');

    worker.current.postMessage({
      type: 'run', data: {
        text: nextConversation.join('\n'),
        url: image,
        task,
        language,
        conversation: nextConversation,
      }
    });
  }, [conversation, prompt, image, task, language]);

  return (
    IS_WEBGPU_AVAILABLE
      ? (
        <div className="flex flex-col min-h-screen mx-auto text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-900">

          {status === 'loading' && (
            <div className="flex justify-center items-center fixed w-screen h-screen bg-black z-20 bg-opacity-[92%] top-0 left-0">
              <div className="w-[500px]">
                <p className="text-center mb-1 text-white text-md">{loadingMessage}</p>
                {progressItems.map(({ file, progress, total }, i) => (
                  <Progress key={i} text={file} percentage={progress} total={total} />
                ))}
              </div>
            </div>
          )}

          <header className="w-full p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
            <div className="max-w-3xl mx-auto flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">Pet Name Picker</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">Upload a pet photo and get name ideas in any language.</p>
              </div>
              <div className="text-sm text-gray-500">More Detailed Caption</div>
            </div>
          </header>

          <main className="flex-1 w-full p-6">
            <section className="mx-auto w-full bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="md:w-1/2 flex flex-col gap-4">
                  <label className="text-sm">Preferred language</label>
                  <input className="border rounded-md px-3 py-2" value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="e.g. English, Español, 日本語" />

                  <label className="text-sm mt-2">Upload pet photo</label>
                  <ImageInput className="flex flex-col items-center border border-gray-300 rounded-md cursor-pointer h-[300px]" onImageChange={(file, result) => {
                    worker.current.postMessage({ type: 'reset' }); // Reset image cache
                    setResult(null);
                    setConversation([]);
                    setImage(result);
                  }} />

                  <div className="flex items-center gap-2 mt-2">
                    {status === null ? (
                      <button className="px-4 py-2 rounded bg-blue-500 text-white" onClick={handleLoadModel}>Load model</button>
                    ) : null}
                    <button className="px-4 py-2 rounded bg-green-500 text-white disabled:opacity-50" disabled={status === 'running' || image === null} onClick={() => handleAsk('Give me 10 pet name ideas')}>{status === 'running' ? 'Thinking…' : 'Suggest names'}</button>
                  </div>
                </div>

                <div className="md:w-1/2 flex flex-col gap-3">
                  <label className="text-sm">Conversation & prompts</label>
                  <div className="flex flex-col border rounded-md p-3 h-[300px] overflow-auto bg-gray-50 dark:bg-gray-800">
                    {conversation.length === 0 && <p className="text-sm text-gray-500">No prompts yet — ask for names to start the conversation.</p>}
                    {conversation.map((c, i) => (
                      <div key={i} className="mb-2">
                        <div className="text-xs text-gray-400">You</div>
                        <div className="bg-white dark:bg-gray-700 px-3 py-2 rounded mt-1 text-sm">{c}</div>
                      </div>
                    ))}

                    {result && (
                      <div className="mt-3">
                        <div className="text-xs text-gray-400">Suggestions</div>
                        <div className="bg-white dark:bg-gray-700 px-3 py-2 rounded mt-1 text-sm">
                          {typeof result === 'string' ? <pre className="whitespace-pre-wrap">{result}</pre> : <pre className="whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>}
                        </div>
                        {time && <div className="text-xs text-gray-400 mt-1">Execution time: {time.toFixed(2)} ms</div>}
                      </div>
                    )}
                  </div>

                  <textarea className="border rounded-md p-2 mt-2" rows={3} placeholder="Add more context or ask again (e.g. 'short names', 'funny names')" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
                  <div className="flex gap-2">
                    <button className="px-4 py-2 rounded bg-blue-600 text-white" disabled={status === 'running' || image === null || !prompt} onClick={() => handleAsk()}>{status === 'running' ? 'Thinking…' : 'Ask again'}</button>
                    <button className="px-4 py-2 rounded bg-gray-200" onClick={() => { setConversation([]); setResult(null); setPrompt(''); }}>Reset</button>
                  </div>
                </div>
              </div>
            </section>
          </main>

          <footer className="w-full p-4 border-t border-gray-200 dark:border-gray-700 text-center text-sm text-gray-500">
            © {new Date().getFullYear()} Pet Name Picker — suggestions are generated locally in your browser.
          </footer>
        </div>
      ) : (
        <div className="fixed w-screen h-screen bg-black z-10 bg-opacity-[92%] text-white text-2xl font-semibold flex justify-center items-center text-center">WebGPU is not supported<br />by this browser :&#40;</div>
      )
  )
}

export default App
