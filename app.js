import React, { useReducer, useEffect, useState, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  onSnapshot, 
  collection, 
  query,
  updateDoc
} from 'firebase/firestore';
import { 
  Plus, 
  Trash2, 
  Play, 
  FileCode, 
  BookOpen, 
  CheckCircle, 
  Terminal, 
  Layout, 
  Settings,
  AlertCircle,
  Copy,
  Code,
  FileText,
  Check,
  Save,
  Share2,
  Cpu,
  Zap,
  Layers,
  ChevronRight,
  Monitor,
  ChevronLeft
} from 'lucide-react';

// --- Firebase Configuration & Setup ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'project-reviver-pro';

// --- Types & Constants ---
const LANGUAGES = [
  { id: 'javascript', ext: '.js', label: 'JavaScript' },
  { id: 'typescript', ext: '.ts', label: 'TypeScript' },
  { id: 'python', ext: '.py', label: 'Python' },
  { id: 'html', ext: '.html', label: 'HTML' },
  { id: 'css', ext: '.css', label: 'CSS' },
  { id: 'json', ext: '.json', label: 'JSON' },
  { id: 'markdown', ext: '.md', label: 'Markdown' }
];

// --- Utility Service ---
const ProjectService = {
  getExt: (lang) => LANGUAGES.find(l => l.id === lang)?.ext || '.txt',
  
  analyze: (snippets) => {
    const analysis = {
      files: [],
      dependencies: new Set(),
      steps: ["יצירת תיקיית שורש לפרויקט."],
      errors: []
    };

    if (!snippets || snippets.length === 0 || snippets.every(s => !s.content.trim())) {
      analysis.errors.push("לא זוהה קוד. אנא הוסף לוגיקה לקטעי הקוד שלך.");
      return analysis;
    }

    snippets.forEach(s => {
      if (!s.content.trim()) analysis.errors.push(`אזהרה: הקובץ "${s.title}" ריק כרגע.`);
      
      analysis.files.push({ 
        name: s.title, 
        lang: s.language, 
        extension: ProjectService.getExt(s.language) 
      });

      // Dependency Extraction logic
      const patterns = [
        /(?:import|from)\s+['"]([^'"]+)['"]/g,
        /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
        /^import\s+([a-zA-Z0-9_]+)/gm
      ];

      patterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(s.content)) !== null) {
          const dep = match[1];
          if (!dep.startsWith('.') && !dep.startsWith('/') && !dep.startsWith('~')) {
            analysis.dependencies.add(dep.split('/')[0]);
          }
        }
      });

      analysis.steps.push(`יצירת קובץ מקור: ${s.title}${ProjectService.getExt(s.language)}`);
    });

    const deps = Array.from(analysis.dependencies);
    if (deps.length > 0) {
      const isPy = snippets.some(s => s.language === 'python');
      analysis.steps.push(`התקנת חבילות נדרשות: ${isPy ? 'pip install' : 'npm install'} ${deps.join(' ')}`);
    }

    analysis.steps.push("הגדרת משתני סביבה והרצת המערכת.");
    return { ...analysis, dependencies: deps };
  }
};

// --- Sub-Components ---

const Header = ({ activeTab, setTab, onAnalyze, user, syncing }) => (
  <header className="flex flex-col md:flex-row items-center justify-between mb-10 gap-6 border-b border-slate-200 pb-8">
    <div className="flex items-center gap-4">
      <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-xl shadow-indigo-200">
        <Monitor size={32} />
      </div>
      <div className="text-right">
        <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2">
          Reviver <span className="text-indigo-600">OS</span>
          {syncing && <Zap size={18} className="animate-pulse text-amber-500" />}
        </h1>
        <div className="flex items-center gap-2 text-slate-500 font-medium text-xs">
          <div className={`w-2 h-2 rounded-full ${user ? 'bg-emerald-500' : 'bg-slate-300'}`} />
          {user ? `סביבת ענן פעילה: ${user.uid.slice(0, 8)}` : 'מתחבר למערכת...'}
        </div>
      </div>
    </div>
    
    <div className="flex bg-white rounded-2xl p-1.5 shadow-sm border border-slate-200">
      <button 
        onClick={() => setTab('editor')}
        className={`px-6 py-2.5 rounded-xl flex items-center gap-2 transition-all font-bold text-sm ${activeTab === 'editor' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-600 hover:bg-slate-50'}`}
      >
        <Code size={18} /> עורך קוד
      </button>
      <button 
        onClick={onAnalyze}
        className={`px-6 py-2.5 rounded-xl flex items-center gap-2 transition-all font-bold text-sm ${activeTab === 'analysis' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-600 hover:bg-slate-50'}`}
      >
        <Layers size={18} /> תוכנית עבודה
      </button>
    </div>
  </header>
);

const CodeEditor = ({ snippet, onUpdate, onRemove, index }) => {
  const [copied, setCopied] = useState(false);
  const lineCount = snippet.content.split('\n').length;

  const handleCopy = () => {
    const el = document.createElement('textarea');
    el.value = snippet.content;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden transition-all hover:shadow-xl hover:shadow-indigo-50/50 mb-8 group/card">
      <div className="bg-slate-50/80 px-8 py-5 border-b border-slate-200 flex items-center justify-between flex-row-reverse">
        <div className="flex items-center gap-5 flex-row-reverse flex-1">
          <div className="w-10 h-10 bg-white border border-slate-200 text-slate-400 rounded-xl flex items-center justify-center font-black text-xs shadow-sm group-hover/card:bg-indigo-600 group-hover/card:text-white group-hover/card:border-indigo-600 transition-all">
            {index + 1}
          </div>
          <div className="flex items-center gap-2 flex-row-reverse">
            <input 
              className="bg-transparent border-none focus:ring-0 font-mono text-sm text-slate-800 font-black p-0 min-w-[150px] text-left"
              value={snippet.title}
              onChange={(e) => onUpdate({ title: e.target.value })}
              placeholder="שם הקובץ"
              dir="ltr"
            />
            <span className="text-slate-400 font-mono text-xs bg-white px-2 py-1 border border-slate-200 rounded uppercase">
              {ProjectService.getExt(snippet.language)}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-4 flex-row-reverse">
          <select 
            className="text-[11px] font-black uppercase tracking-wider bg-white border border-slate-200 rounded-xl px-4 py-2.5 outline-none text-slate-600 focus:ring-2 focus:ring-indigo-500/20 cursor-pointer shadow-sm"
            value={snippet.language}
            onChange={(e) => onUpdate({ language: e.target.value })}
          >
            {LANGUAGES.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
          </select>
          <button 
            onClick={onRemove} 
            className="text-slate-300 hover:text-rose-500 p-2.5 bg-white border border-slate-200 rounded-xl transition-all hover:shadow-md active:scale-90"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
      
      <div className="relative flex bg-[#0d1117] min-h-[400px]" dir="ltr">
        <div className="w-12 bg-[#161b22] text-slate-600 text-right pr-4 pt-8 font-mono text-[10px] border-r border-slate-800/50 select-none">
          {Array.from({ length: Math.max(lineCount, 1) }).map((_, i) => (
            <div key={i} className="h-6 leading-6">{i + 1}</div>
          ))}
        </div>
        <textarea 
          className="flex-1 p-8 pt-8 font-mono text-sm border-none focus:ring-0 resize-none text-slate-300 bg-transparent caret-indigo-400 leading-6 outline-none text-left"
          placeholder={`// Logic for module ${snippet.title}...`}
          value={snippet.content}
          onChange={(e) => onUpdate({ content: e.target.value })}
          spellCheck="false"
        />
        <button 
          onClick={handleCopy}
          className={`absolute top-6 right-6 p-2.5 rounded-xl border transition-all ${copied ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-white hover:bg-slate-700'}`}
        >
          {copied ? <Check size={18} /> : <Copy size={18} />}
        </button>
      </div>
    </div>
  );
};

const BlueprintView = ({ analysis }) => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-8 duration-700" dir="rtl">
    <div className="space-y-6">
      <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-200 text-right">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-8 flex items-center justify-end gap-2">
          ארכיטקטורה <Layout size={14} />
        </h3>
        <div className="space-y-2">
          <div className="flex items-center justify-end gap-3 text-slate-800 font-black bg-indigo-50 p-5 rounded-2xl mb-6 border border-indigo-100 shadow-sm">
            📁 root_project/
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          </div>
          {analysis?.files.map(f => (
            <div key={f.name} className="flex items-center justify-end gap-3 text-slate-600 text-sm mr-8 py-3 border-r-2 border-slate-100 pr-8 group hover:bg-slate-50 rounded-l-2xl transition-all">
              <span className="font-mono font-bold tracking-tight" dir="ltr">{f.name}{f.extension}</span>
              <FileCode size={18} className="text-indigo-500 opacity-60 group-hover:opacity-100 transition-opacity" />
            </div>
          ))}
        </div>
      </div>
      
      <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-200 text-right">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-8 flex items-center justify-end gap-2">
          חבילות ותלויות <Settings size={14} />
        </h3>
        <div className="flex flex-wrap justify-end gap-2.5">
          {analysis?.dependencies.length ? analysis.dependencies.map(d => (
            <span key={d} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-mono font-black border border-slate-800 shadow-sm hover:scale-105 transition-transform cursor-default" dir="ltr">
              {d}
            </span>
          )) : (
            <div className="text-slate-400 text-xs italic p-6 text-center w-full bg-slate-50 rounded-2xl">
              לא זוהו ספריות חיצוניות.
            </div>
          )}
        </div>
      </div>
    </div>

    <div className="lg:col-span-2 space-y-6 text-right">
      {analysis?.errors.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-[2rem] p-8 flex flex-row-reverse gap-5 text-rose-800 shadow-sm">
          <div className="p-3 bg-white rounded-2xl shadow-sm h-fit">
            <AlertCircle className="text-rose-500" size={24} />
          </div>
          <div className="flex-1">
            <p className="font-black text-lg mb-2">אזהרות מערכת</p>
            <ul className="space-y-2 text-sm font-medium opacity-80">
              {analysis.errors.map((e, i) => <li key={i} className="flex items-center justify-end gap-2">{e} <ChevronLeft size={14} /></li>)}
            </ul>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[2.5rem] p-12 shadow-sm border border-slate-200 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-50 rounded-full -ml-32 -mt-32 opacity-30" />
        <h3 className="text-3xl font-black mb-16 flex items-center justify-end gap-4 text-slate-800">
          מפת דרכים לביצוע <BookOpen className="text-indigo-600" size={32} />
        </h3>
        <div className="space-y-16 relative">
          {analysis?.steps.map((step, i) => (
            <div key={i} className="flex flex-row-reverse gap-10 group">
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 font-black text-2xl group-hover:bg-indigo-600 group-hover:text-white group-hover:scale-110 transition-all shadow-sm">
                  {i + 1}
                </div>
                {i !== analysis.steps.length - 1 && <div className="w-1 h-full bg-slate-50 mt-6 group-hover:bg-indigo-50 transition-colors" />}
              </div>
              <div className="pt-4 flex-1">
                <p className="text-slate-800 font-black text-xl group-hover:text-indigo-600 transition-colors tracking-tight">{step}</p>
                <p className="text-slate-400 text-sm mt-2 font-medium">רכיב מאומת אוטומטית • שלב {i + 1}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-indigo-900 rounded-[3rem] p-10 flex flex-col sm:flex-row-reverse items-center justify-between text-white shadow-2xl shadow-indigo-200 relative overflow-hidden gap-8">
        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-indigo-500/20 to-transparent pointer-events-none" />
        <div className="flex flex-row-reverse items-center gap-6">
          <div className="w-16 h-16 bg-white/10 rounded-3xl flex items-center justify-center backdrop-blur-md border border-white/10 shadow-inner">
            <Share2 size={28} />
          </div>
          <div>
            <h4 className="font-black text-2xl tracking-tight text-right">הפרויקט מוכן לפריסה</h4>
            <p className="text-indigo-300 text-sm font-bold opacity-80 text-right">סנכרון ענן פעיל בזמן אמת</p>
          </div>
        </div>
        <button 
          onClick={() => window.print()} 
          className="bg-white text-indigo-900 px-12 py-5 rounded-[1.5rem] font-black hover:bg-indigo-50 transition-all active:scale-95 shadow-xl whitespace-nowrap"
        >
          ייצוא דוקומנטציה
        </button>
      </div>
    </div>
  </div>
);

// --- Main App ---

const App = () => {
  const [user, setUser] = useState(null);
  const [snippets, setSnippets] = useState([]);
  const [activeTab, setTab] = useState('editor');
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth error:", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const workspaceDoc = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'workspace');
    const unsubscribe = onSnapshot(workspaceDoc, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (JSON.stringify(data.snippets) !== JSON.stringify(snippets)) {
          setSnippets(data.snippets || []);
        }
      } else {
        const initial = [{ id: crypto.randomUUID(), title: 'app', content: '', language: 'javascript' }];
        setDoc(workspaceDoc, { snippets: initial });
        setSnippets(initial);
      }
      setLoading(false);
    }, (err) => {
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const persistChanges = async (newSnippets) => {
    if (!user) return;
    setSyncing(true);
    try {
      const workspaceDoc = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'workspace');
      await updateDoc(workspaceDoc, { snippets: newSnippets });
    } catch (err) {
      console.error("Persist error:", err);
    } finally {
      setSyncing(false);
    }
  };

  const addSnippet = () => {
    const newList = [...snippets, { 
      id: crypto.randomUUID(), 
      title: `module_${snippets.length + 1}`, 
      content: '', 
      language: 'javascript' 
    }];
    setSnippets(newList);
    persistChanges(newList);
  };

  const updateSnippet = (id, updates) => {
    const newList = snippets.map(s => s.id === id ? { ...s, ...updates } : s);
    setSnippets(newList);
    persistChanges(newList);
  };

  const removeSnippet = (id) => {
    if (snippets.length <= 1) return;
    const newList = snippets.filter(s => s.id !== id);
    setSnippets(newList);
    persistChanges(newList);
  };

  const runAnalysis = () => {
    const result = ProjectService.analyze(snippets);
    setAnalysis(result);
    setTab('analysis');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-6" dir="rtl">
        <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-slate-400 font-black tracking-widest text-xs uppercase animate-pulse font-sans">טוען מערכת הפעלה...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-6 md:p-16 selection:bg-indigo-100 selection:text-indigo-900 overflow-x-hidden">
      <div className="max-w-6xl mx-auto">
        <Header 
          activeTab={activeTab} 
          setTab={setTab} 
          onAnalyze={runAnalysis} 
          user={user} 
          syncing={syncing}
        />

        <main>
          {activeTab === 'editor' ? (
            <div className="space-y-4 pb-24">
              {snippets.map((snippet, idx) => (
                <CodeEditor 
                  key={snippet.id}
                  index={idx}
                  snippet={snippet}
                  onUpdate={(u) => updateSnippet(snippet.id, u)}
                  onRemove={() => removeSnippet(snippet.id)}
                />
              ))}
              <button 
                onClick={addSnippet}
                className="w-full py-16 border-4 border-dashed border-slate-200 rounded-[3rem] text-slate-300 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/30 transition-all flex flex-col items-center justify-center gap-4 group"
              >
                <div className="p-5 bg-slate-100 rounded-3xl group-hover:bg-indigo-600 group-hover:text-white group-hover:scale-110 transition-all shadow-sm">
                  <Plus size={36} strokeWidth={3} />
                </div>
                <span className="font-black text-lg tracking-tight">הוסף מודול לוגיקה חדש</span>
              </button>
            </div>
          ) : (
            <BlueprintView analysis={analysis} />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
