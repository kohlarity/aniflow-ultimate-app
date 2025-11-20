import React, { useState, useEffect, useMemo, Component, memo, useCallback, useRef } from 'react';
import { 
  Plus, Search, Tv, CheckCircle, Clock, XCircle, Edit2, Trash2, Star, TrendingUp, 
  LayoutGrid, List as ListIcon, Settings, Save, Upload, AlertTriangle, Palette, 
  Layout as LayoutIcon, Download, ExternalLink, Maximize2, Minimize2, Heart, 
  Shuffle, BarChart2, Filter, ChevronDown, Tag, Clock3, Volume2, VolumeX, Zap, 
  Eye, EyeOff, Layers, Film, Terminal, Sparkles, Bot, MessageSquare, Flame, History, Send,
  Database, Command, Globe, Grid, CheckSquare, Focus, Activity, Quote, Unlock, Lock, Calendar,
  BrainCircuit
} from 'lucide-react';

const apiKey = "AIzaSyDvvH0xVF2yCPXFV6aQNefETt7uXSzf3hc"; 

async function callGemini(history, systemOverride) {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
    const tools = [{ google_search: {} }];
    const defaultSystem = `You are "AniChat", an anime expert. STYLE: Bullet points, concise, casual. Use **bold** for titles. AGENT: If user confirms adding, output: ||ADD:{"title":"X","totalEps":12,"tags":"Y"}||`;
    const contents = [{ role: 'user', parts: [{ text: systemOverride || defaultSystem }] }, ...history.map(msg => ({ role: msg.role === 'ai' ? 'model' : 'user', parts: [{ text: msg.text }] }))];
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents, tools }) });
    if (!response.ok) throw new Error('AI Offline');
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "AI Silent.";
  } catch (e) { return "Connection error."; }
}

const MarkdownRenderer = ({ content }) => {
  const formatText = (text) => ({ __html: text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>').replace(/\n/g, '<br />') });
  return <div className="markdown-text text-sm leading-relaxed" dangerouslySetInnerHTML={formatText(content)} />;
};

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError(error) { return { hasError: true }; }
  render() {
    if (this.state.hasError) return <div className="min-h-screen bg-black text-red-500 p-10 flex flex-col items-center justify-center text-center"><h1>SYSTEM FAILURE</h1><button onClick={() => {localStorage.clear(); window.location.reload()}} className="bg-red-900/50 p-3 rounded text-white mt-4">HARD RESET</button></div>;
    return this.props.children; 
  }
}

// --- OPTIMIZED COMPONENTS ---
const Card = memo(({ children, className = "", styleConfig }) => (<div className={`${styleConfig.card} overflow-hidden shadow-xl transition-all duration-300 ${className}`}>{children}</div>));
const Badge = memo(({ children, color = "blue", themeConfig }) => {
  let c = themeConfig.badge_blue;
  if (color === 'green') c = 'bg-green-500/20 text-green-300 border-green-500/30';
  if (color === 'red') c = 'bg-red-500/20 text-red-300 border-red-500/30';
  if (color === 'yellow') c = 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
  return (<span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wide ${c}`}>{children}</span>);
});

// --- MAIN APP ---
function AniFlow() {
  const [animeList, setAnimeList] = useState([]);
  const [history, setHistory] = useState([]);
  const [prefs, setPrefs] = useState({ theme: 'cosmic', hue: 250, scale: 1, sound: true, zen: false, spoiler: false, tilt: true, density: 'normal', view: 'grid', showNotes: false, customPrimary: '#818cf8', customBg: '#0a0a0f' });
  const [ui, setUi] = useState({ tab: 'watching', search: '', sort: 'updated', modal: null, batchMode: false, selected: [], privacy: false, quote: "Loading..." });
  const [isLoaded, setIsLoaded] = useState(false); // DATA SAFETY FLAG

  const [editItem, setEditItem] = useState(null);
  const [toast, setToast] = useState(null);
  const [celebration, setCelebration] = useState(null);
  const [chatLog, setChatLog] = useState([{role: 'ai', text: "Yo! I'm **AniChat**. I can check the web and update your list! 🌍"}]);
  const [chatInput, setChatInput] = useState('');
  const [aiLoad, setAiLoad] = useState(false);
  const [vibeResult, setVibeResult] = useState(null);
  const chatEndRef = useRef(null);

  const emptyForm = { title: '', status: 'watching', currentEp: '', totalEps: '', rating: '', image: '', studio: '', source: 'Original', duration: 24, priority: 'Medium', notes: '', tags: '', season: '', favorite: false };
  const [form, setForm] = useState(emptyForm);

  const THEMES = useMemo(() => ({
    cosmic: { label: 'Cosmic', bg: 'bg-[#0a0a0f]', bg_grad: 'bg-gradient-to-br from-[#0a0a0f] via-[#13131f] to-[#0a0a0f]', nav: 'bg-[#0a0a0f]/90 border-white/5', badge_blue: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
    custom: { label: 'Custom', bg: '', bg_grad: '', nav: 'glass-panel', badge_blue: 'bg-white/10 text-white border-white/20' }
  }), []);
  
  const STYLES = useMemo(() => ({
    glass: { card: 'bg-gray-900/60 backdrop-blur-md border border-white/5 rounded-2xl', input: 'bg-black/20 border border-white/10 rounded-xl', button: 'rounded-xl' },
    solid: { card: 'bg-gray-800 border border-gray-700 rounded-xl', input: 'bg-gray-900 border border-gray-700 rounded-lg', button: 'rounded-lg' },
    neo: { card: 'bg-gray-900 border-2 border-white/20 rounded-none shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]', input: 'bg-black border-2 border-white/20 rounded-none', button: 'rounded-none border-2 border-transparent active:translate-y-1 active:shadow-none' }
  }), []);

  const currentTheme = prefs.theme === 'custom' ? THEMES.custom : (THEMES[prefs.theme] || THEMES.cosmic);
  const currentStyle = STYLES[prefs.style] || STYLES.glass;
  const primary = prefs.theme === 'custom' ? prefs.customPrimary : `hsl(${prefs.hue}, 70%, 60%)`;

  // --- DATA LOADING (FIXED) ---
  useEffect(() => {
    const d = localStorage.getItem('af-data');
    if (d) {
       try { setAnimeList(JSON.parse(d)); } catch(e) { console.error("Data Corrupt"); }
    } else {
       // Only seed defaults if NO data exists
       setAnimeList([{ id: 1, title: 'Akira', status: 'completed', currentEp: 1, totalEps: 1, rating: 10, studio: 'TMS', source: 'Manga', duration: 124, priority: 'High', tags: ['Sci-Fi', 'Classic'], addedAt: Date.now(), lastUpdated: Date.now() }]);
    }
    
    const h = localStorage.getItem('af-hist'); if (h) setHistory(JSON.parse(h) || []);
    const p = localStorage.getItem('af-prefs'); if (p) setPrefs({...prefs, ...JSON.parse(p)});
    
    callGemini([{role: 'user', text: 'Give me one short, inspiring anime quote. Format: "Quote" - Character'}], "You are a quote generator.").then(r => setUi(p => ({...p, quote: r})));
    
    setIsLoaded(true); // Safe to save now
  }, []);

  // --- PERSISTENCE (SAFEGUARDED) ---
  useEffect(() => {
    if (isLoaded) localStorage.setItem('af-data', JSON.stringify(animeList));
  }, [animeList, isLoaded]);

  useEffect(() => { if(isLoaded) localStorage.setItem('af-hist', JSON.stringify(history)); }, [history, isLoaded]);
  useEffect(() => { if(isLoaded) localStorage.setItem('af-prefs', JSON.stringify(prefs)); }, [prefs, isLoaded]);

  useEffect(() => {
    const k = (e) => { 
      if(e.ctrlKey && e.key === 'k') { e.preventDefault(); document.getElementById('search')?.focus(); }
      if(e.ctrlKey && e.key === 'b') { e.preventDefault(); handleAdd(); }
      if(e.key === 'p' && document.activeElement.tagName !== 'INPUT') { setUi(p => ({...p, privacy: !p.privacy})); } 
    };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, []);

  const showToast = (msg, type='success') => { setToast({msg, type}); setTimeout(()=>setToast(null), 3000); playSound(type==='success'?'success':'click'); };
  const log = (act) => setHistory(prev => [{t: act, d: new Date().toISOString()}, ...prev].slice(0, 100));
  const playSound = (type) => { if(!prefs.sound) return; const ctx=new(window.AudioContext||window.webkitAudioContext)(),o=ctx.createOscillator(),g=ctx.createGain();o.connect(g);g.connect(ctx.destination);const t=ctx.currentTime;if(type==='click'){o.frequency.setValueAtTime(800,t);o.frequency.exponentialRampToValueAtTime(400,t+.1);g.gain.setValueAtTime(.05,t);g.gain.exponentialRampToValueAtTime(.01,t+.1)}else{o.type='triangle';o.frequency.setValueAtTime(440,t);o.frequency.linearRampToValueAtTime(880,t+.1);g.gain.setValueAtTime(.05,t);g.gain.linearRampToValueAtTime(0,t+.3)}o.start();o.stop(t+.3); };
  const handleNumberInput = (val) => { if (val === '') return ''; const parsed = parseInt(val); return isNaN(parsed) ? '' : parsed; };
  const getRemaining = (c, t, d) => { if(!t || c>=t) return null; const m = (t-c)*(d||24); return m>60 ? `${Math.floor(m/60)}h ${m%60}m left` : `${m}m left`; };

  const handleAdd = () => { setEditItem(null); setForm(emptyForm); setUi(p => ({...p, modal: 'edit'})); };
  const saveAnime = (e) => {
    e.preventDefault();
    const clean = { ...form, currentEp: +form.currentEp||0, totalEps: +form.totalEps||0, rating: +form.rating||0, duration: +form.duration||24, tags: typeof form.tags==='string'?form.tags.split(',').filter(t=>t.trim()):form.tags, lastUpdated: Date.now() };
    if (editItem) { setAnimeList(l => l.map(a => a.id === editItem.id ? { ...clean, id: a.id } : a)); showToast('Updated!'); } 
    else { setAnimeList(l => [...l, { ...clean, id: Date.now(), addedAt: Date.now() }]); showToast('Added!'); }
    setUi(p => ({...p, modal: null}));
  };

  const quickAdd = useCallback((id, amt) => {
    setAnimeList(l => l.map(a => {
      if (a.id !== id) return a;
      const next = (a.currentEp||0) + amt, max = a.totalEps || 9999;
      if (a.totalEps > 0 && next >= max && a.status !== 'completed') { showToast('Completed!', 'success'); setCelebration(true); setTimeout(()=>setCelebration(false),4000); log(`Completed ${a.title}`); return { ...a, currentEp: max, status: 'completed', lastUpdated: Date.now() }; }
      log(`Watched ${a.title} Ep ${next}`); return { ...a, currentEp: Math.min(next, max), lastUpdated: Date.now() };
    }));
    playSound('click');
  }, []);

  const deleteAnime = () => { if(confirm("Delete this anime?")) { setAnimeList(l => l.filter(a => a.id !== editItem.id)); setUi(p => ({...p, modal: null})); showToast('Deleted', 'error'); } };
  const toggleSelect = (id) => setUi(p => ({...p, selected: p.selected.includes(id) ? p.selected.filter(i => i !== id) : [...p.selected, id]}));
  const batchAction = (act) => { if(act==='delete'){if(!confirm(`Delete ${ui.selected.length}?`))return;setAnimeList(l=>l.filter(a=>!ui.selected.includes(a.id)))}else if(act==='complete'){setAnimeList(l=>l.map(a=>ui.selected.includes(a.id)?{...a,status:'completed',currentEp:a.totalEps||a.currentEp}:a))} setUi(p=>({...p, selected:[], batchMode:false})); showToast('Batch Done'); };
  
  const handleShuffle = () => {
    const pool = animeList.filter(a => a.status === 'planning' || a.status === 'watching');
    if (pool.length === 0) return showToast("No shows to shuffle!", "error");
    const winner = pool[Math.floor(Math.random() * pool.length)];
    alert(`🎲 The stars align! Watch:\n\n✨ ${winner.title} ✨`);
  };

  const handleChat = async (e) => {
    e.preventDefault(); if (!chatInput.trim()) return;
    const msg = { role: 'user', text: chatInput }; setChatLog(p => [...p, msg]); setChatInput(''); setAiLoad(true);
    const res = await callGemini([...chatLog.slice(-4), msg]);
    const match = res.match(/\|\|ADD:(.*?)\|\|/);
    let action = null, cleanRes = res;
    if (match) { try { const d = JSON.parse(match[1]); cleanRes = res.replace(match[0], '').trim(); if (!animeList.some(a => a.title.toLowerCase() === d.title.toLowerCase())) { setAnimeList(p => [...p, { ...emptyForm, title: d.title, totalEps: d.totalEps||12, tags: d.tags?d.tags.split(','):[], status: 'planning', id: Date.now(), addedAt: Date.now() }]); action = { type: 'success', text: `Added ${d.title}` }; } else action = { type: 'error', text: 'Already in list' }; } catch (err) {} }
    setChatLog(p => [...p, { role: 'ai', text: cleanRes, action }]); setAiLoad(false);
    chatEndRef.current?.scrollIntoView({behavior:'smooth'});
  };

  const handleAiTag = async () => {
    if(!form.title) return showToast("Title needed!", "error"); setAiLoad(true);
    const r = await callGemini([{ role: 'user', text: `Return exactly 3 comma-separated genres for "${form.title}". No words.` }]);
    if(r) setForm(p => ({ ...p, tags: r.replace(/\./g, '') })); setAiLoad(false);
  };

  const handleAiReview = async () => {
     if(!form.title || !form.rating) return showToast("Title & Rating needed!", "error"); setAiLoad(true);
     const r = await callGemini([{ role: 'user', text: `Write a 1-sentence casual review for "${form.title}" given a ${form.rating}/10 rating.` }]);
     if(r) setForm(p => ({ ...p, notes: r })); setAiLoad(false);
  };

  const handleVibeCheck = async (anime) => {
     setUi(p => ({...p, modal: 'vibe'})); setVibeResult(null);
     const r = await callGemini([{ role: 'user', text: `Recommend 3 anime similar to "${anime.title}". Return valid JSON array: [{"title":"X","reason":"Y"},...]` }], "You are a JSON generator.");
     try { setVibeResult(JSON.parse(r.replace(/```json|```/g, ''))); } catch(e) { setVibeResult([]); }
  };

  const filtered = useMemo(() => {
    let l = animeList.filter(a => a.title.toLowerCase().includes(ui.search.toLowerCase()));
    if (ui.tab === 'fav') l = l.filter(a => a.favorite); else if (ui.tab !== 'all') l = l.filter(a => a.status === ui.tab);
    return l.sort((a, b) => {
      if (ui.sort === 'rating') return (b.rating||0)-(a.rating||0);
      if (ui.sort === 'updated') return b.lastUpdated-a.lastUpdated;
      if (ui.sort === 'studio') return (a.studio||'').localeCompare(b.studio||'');
      return a.title.localeCompare(b.title);
    });
  }, [animeList, ui.tab, ui.search, ui.sort]);

  const stats = useMemo(() => {
    const completed = animeList.filter(a => a.status === 'completed');
    const totalMins = animeList.reduce((a, c) => a + (c.currentEp||0) * (c.duration||24), 0);
    const genres = {}; animeList.forEach(a => a.tags?.forEach(t => genres[t] = (genres[t]||0)+1));
    return { total: animeList.length, completed: completed.length, days: (totalMins/1440).toFixed(1), genres, remainingMins: animeList.reduce((a,c)=>a+((c.totalEps||0)-(c.currentEp||0))*(c.duration||24),0) };
  }, [animeList]);

  const upNext = useMemo(() => animeList.filter(a => a.status === 'watching' && a.priority === 'High').slice(0, 5), [animeList]);

  return (
    <div className={`min-h-screen text-gray-100 font-sans transition-colors duration-500 ${currentTheme.bg} ${currentTheme.bg_grad} selection:bg-white/20 overflow-x-hidden`} style={prefs.theme === 'custom' ? {background: prefs.customBg} : {}}>
      <style>{`input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none !important; margin: 0 !important; } input[type=number] { -moz-appearance: textfield !important; } .glass-panel{background:rgba(20,20,30,0.6);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.05)}.tilt-card{transition:transform 0.1s ease}.tilt-card:hover{transform:scale(1.02)}input,select,textarea{background:rgba(0,0,0,0.3)!important;border:1px solid rgba(255,255,255,0.1)!important;color:white!important}.privacy-blur{filter:blur(8px)}.ai-msg strong { color: white; font-weight: 800; } .ai-msg em { color: #a5b4fc; font-style: italic; }`}</style>
      
      {celebration && <div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center"><div className="absolute inset-0 bg-black/20 backdrop-blur-[2px] animate-pulse"/><h1 className="text-6xl font-black text-white animate-bounce drop-shadow-[0_0_30px_gold]">COMPLETED!</h1></div>}
      {toast && <div className="fixed bottom-8 right-8 z-[100] animate-[slideUp_0.3s_ease-out]"><div className="glass-panel px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-sm font-bold border-l-4" style={{borderLeftColor:primary}}>{toast.type==='success'?<CheckCircle size={16} color={primary}/>:<Zap size={16} color="#fbbf24"/>}{toast.msg}</div></div>}
      
      {!prefs.zen && (
        <nav className="sticky top-0 z-40 glass-panel border-b-0 border-b-white/5">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-xl"><Terminal size={20} style={{color:primary}}/>Ani<span style={{color:primary}}>Flow</span></div>
            <div className="hidden md:flex items-center gap-4 text-xs text-gray-400 font-mono bg-black/20 px-3 py-1 rounded-lg border border-white/5"><Quote size={12} className="text-gray-500"/> {ui.quote}</div>
            <div className="flex items-center gap-2">
              <button onClick={()=>handleShuffle()} className="p-2 hover:bg-white/5 rounded-lg text-purple-400" title="Smart Shuffle"><Shuffle size={18}/></button>
              <button onClick={()=>setUi(p=>({...p, modal:'ai'}))} className="p-2 hover:bg-white/5 rounded-lg text-indigo-400" title="AI Lab"><Bot size={18}/></button>
              <button onClick={()=>setPrefs(p=>({...p,zen:true}))} className="p-2 hover:bg-white/5 rounded-lg"><Maximize2 size={18}/></button>
              <button onClick={()=>setUi(p=>({...p, modal:'stats'}))} className="p-2 hover:bg-white/5 rounded-lg"><BarChart2 size={18}/></button>
              <button onClick={()=>setUi(p=>({...p, modal:'settings'}))} className="p-2 hover:bg-white/5 rounded-lg"><Settings size={18}/></button>
              <button onClick={handleAdd} className="flex items-center gap-2 px-4 py-1.5 rounded-lg font-bold text-sm shadow-lg transition-all active:scale-95" style={{background:primary,color:'white'}}><Plus size={16}/> Add</button>
            </div>
          </div>
        </nav>
      )}
      {prefs.zen && <button onClick={() => setPrefs(p => ({...p, zen: false}))} className="fixed top-4 right-4 z-50 p-2 bg-black/50 rounded-full hover:bg-white/20 text-white transition-all"><Minimize2 size={24} /></button>}

      <main className={`max-w-7xl mx-auto px-4 py-8 transition-all duration-500 ${prefs.zen ? 'opacity-100' : ''}`}>
        {!prefs.zen && upNext.length > 0 && (
           <div className="mb-8">
              <h3 className="text-xs font-bold uppercase text-gray-500 mb-3 flex items-center gap-2"><Clock3 size={14}/> Up Next</h3>
              <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                 {upNext.map(a => (
                   <div key={a.id} className={`shrink-0 w-64 p-3 rounded-xl border border-white/5 flex gap-3 items-center ${currentStyle.card} relative group cursor-pointer hover:border-white/20`} onClick={()=>quickAdd(a.id,1)}>
                      <div className="w-12 h-12 bg-black/50 rounded-lg overflow-hidden">{a.image?<img src={a.image} className="w-full h-full object-cover"/>:<div className="w-full h-full bg-gradient-to-br from-white/10 to-transparent"/>}</div>
                      <div className="flex-1 min-w-0"><h4 className="font-bold text-sm truncate text-white">{a.title}</h4><div className="text-xs text-gray-400">Ep {a.currentEp+1} <span className="text-gray-600">•</span> High Priority</div></div>
                      <PlayCircle size={24} className="text-white opacity-0 group-hover:opacity-100 transition-opacity mr-2" fill={primary}/>
                   </div>
                 ))}
              </div>
           </div>
        )}
        {!prefs.zen && (
          <div className="flex flex-wrap gap-4 mb-8 justify-between items-center">
             <div className="flex gap-1 overflow-x-auto pb-2 no-scrollbar">{['watching','completed','planning','dropped','fav'].map(id => (<button key={id} onClick={()=>setUi(p=>({...p, tab:id}))} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold border capitalize transition-all ${ui.tab===id ? 'bg-white/10 border-white/20 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>{id==='fav'?<Heart size={14} color={ui.tab===id?primary:undefined}/>:<Tv size={14} color={ui.tab===id?primary:undefined}/>} {id}</button>))}</div>
             <div className="flex items-center gap-3">
               <div className="relative group"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"/><input value={ui.search} onChange={e=>setUi(p=>({...p, search:e.target.value}))} placeholder="Search..." className={`pl-10 pr-4 py-1.5 rounded-lg text-sm focus:outline-none focus:ring-1 w-40 sm:w-64 ${currentStyle.input}`} style={{'--tw-ring-color':primary}}/></div>
               <button onClick={()=>setUi(p=>({...p, batchMode:!p.batchMode}))} className={`p-2 rounded-lg ${ui.batchMode?'bg-red-500/20 text-red-300':'hover:bg-white/5 text-gray-400'}`} title="Batch Mode"><CheckSquare size={18}/></button>
               <button onClick={()=>setUi(p=>({...p, privacy:!p.privacy}))} className={`p-2 rounded-lg ${ui.privacy?'bg-indigo-500/20 text-indigo-300':'hover:bg-white/5 text-gray-400'}`} title="Privacy Blur"><EyeOff size={18}/></button>
               <select value={ui.sort} onChange={e=>setUi(p=>({...p, sort:e.target.value}))} className={`pl-3 pr-8 py-1.5 rounded-lg text-xs appearance-none cursor-pointer ${currentStyle.input}`}><option value="title">A-Z</option><option value="rating">Rating</option><option value="updated">Recent</option></select>
               <div className="flex bg-black/20 rounded-lg p-1 border border-white/5"><button onClick={()=>setPrefs(p=>({...p,view:'grid'}))} className={`p-1.5 rounded ${prefs.view==='grid'?'bg-white/10 text-white':'text-gray-500'}`}><LayoutGrid size={14}/></button><button onClick={()=>setPrefs(p=>({...p,view:'list'}))} className={`p-1.5 rounded ${prefs.view==='list'?'bg-white/10 text-white':'text-gray-500'}`}><ListIcon size={14}/></button></div>
             </div>
          </div>
        )}
        {ui.batchMode && ui.selected.length > 0 && (<div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-[#1a1b23] border border-white/10 px-6 py-3 rounded-full shadow-2xl flex items-center gap-4 animate-[slideUp_0.2s]"><span className="text-sm font-bold text-white">{ui.selected.length} Selected</span><div className="h-4 w-px bg-white/20"></div><button onClick={()=>batchAction('complete')} className="text-green-400 hover:text-green-300 text-sm font-bold">Mark Complete</button><button onClick={()=>batchAction('delete')} className="text-red-400 hover:text-red-300 text-sm font-bold">Delete</button></div>)}

        <div className={prefs.view==='grid' ? `grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` : 'flex flex-col gap-3'} style={prefs.view==='grid'?{gridTemplateColumns:`repeat(auto-fill, minmax(${250*prefs.scale}px, 1fr))`}:{}}>
          {filtered.map(a => (
            <div key={a.id} className={`${currentStyle.card} overflow-hidden group relative ${prefs.tilt?'tilt-card':''} ${ui.privacy?'privacy-blur':''} ${ui.batchMode && ui.selected.includes(a.id) ? 'ring-2 ring-indigo-500' : ''}`} onClick={() => ui.batchMode && toggleSelect(a.id)}>
              {prefs.view==='grid' ? (
                <>
                  <div className={`relative w-full bg-gray-800 overflow-hidden ${prefs.density==='compact'?'h-32':'h-48'}`}>
                    {a.image ? <img src={a.image} className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110 group-hover:opacity-40"/> : <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-white/5 to-transparent"><span className="text-4xl font-black text-white/10">{a.title.substring(0,2).toUpperCase()}</span></div>}
                    {!ui.batchMode && (
                      <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <button onClick={(e)=>{e.stopPropagation();quickAdd(a.id,1)}} className="p-3 bg-white text-black rounded-full hover:scale-110"><Plus size={20}/></button>
                        <button onClick={(e)=>{e.stopPropagation();setEditItem(a);setForm(a);setUi(p=>({...p, modal:'edit'}))}} className="p-3 bg-black/50 text-white rounded-full hover:bg-black hover:scale-110"><Edit2 size={20}/></button>
                        <button onClick={(e)=>{e.stopPropagation();setUi(p=>({...p, modal:'focus', focusItem:a}))}} className="p-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-500 hover:scale-110" title="Focus Mode"><Focus size={20}/></button>
                        <button onClick={(e)=>{e.stopPropagation();handleVibeCheck(a)}} className="p-3 bg-purple-600 text-white rounded-full hover:bg-purple-500 hover:scale-110" title="Vibe Match"><BrainCircuit size={20}/></button>
                      </div>
                    )}
                    <div className="absolute top-2 right-2 flex flex-col gap-1 items-end"><span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase backdrop-blur-md border bg-black/40 border-white/10`}>{a.status}</span>{a.studio&&<span className="px-2 py-0.5 rounded text-[10px] font-bold bg-black/50 border border-white/10">{a.studio}</span>}</div>
                    {a.favorite && <Heart size={16} className="absolute top-3 left-3 text-pink-500 drop-shadow-lg" fill="currentColor"/>}
                  </div>
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2"><h3 className="font-bold truncate text-sm pr-2" title={a.title}>{a.title}</h3>{a.rating>0&&<div className="flex items-center gap-1 text-yellow-400 text-xs font-bold"><Star size={10} fill="currentColor"/>{a.rating}</div>}</div>
                    <div className="mb-3 relative cursor-help group/p">
                      <div className="flex justify-between text-[10px] text-gray-400 mb-1 font-medium uppercase"><span>Ep {a.currentEp}/{a.totalEps||'?'}</span><span>{getRemaining(a.currentEp, a.totalEps, a.duration)}</span></div>
                      <div className="h-1 bg-gray-700 rounded-full overflow-hidden"><div className="h-full transition-all duration-500" style={{width:`${Math.min(((a.currentEp||0)/(a.totalEps||24))*100,100)}%`, background:primary}}></div></div>
                    </div>
                    {prefs.showNotes && a.notes && <div className="text-xs text-gray-500 italic truncate border-t border-white/5 pt-2 mt-2">"{a.notes}"</div>}
                  </div>
                </>
              ) : (
                <div className="flex items-center p-3 gap-4">
                   <div className="w-10 h-10 bg-gray-800 rounded overflow-hidden">{a.image?<img src={a.image} className="w-full h-full object-cover"/>:<div className="w-full h-full bg-white/5"/>}</div>
                   <div className="flex-1 min-w-0"><div className="flex items-center gap-2"><h3 className="font-bold text-sm">{a.title}</h3></div><div className="text-xs text-gray-500 flex gap-3"><span>Ep {a.currentEp}</span><span>{a.rating?`★${a.rating}`:''}</span></div></div>
                   {!ui.batchMode && <div className="flex gap-2">
                      <button onClick={()=>quickAdd(a.id,1)} className="p-2 bg-white/5 hover:bg-white/10 rounded"><Plus size={14}/></button>
                      <button onClick={()=>{setEditItem(a);setForm(a);setUi(p=>({...p, modal:'edit'}))}} className="p-2 bg-white/5 hover:bg-white/10 rounded"><Edit2 size={14}/></button>
                      <button onClick={()=>handleVibeCheck(a)} className="p-2 bg-white/5 hover:bg-white/10 rounded text-purple-400"><BrainCircuit size={14}/></button>
                   </div>}
                </div>
              )}
            </div>
          ))}
        </div>
      </main>

      {/* --- MODALS --- */}
      {ui.modal === 'vibe' && (
        <div className="fixed inset-0 z-[70] bg-black/90 flex items-center justify-center p-4 animate-[fadeIn_0.2s]">
          <div className="glass-panel w-full max-w-lg p-6 rounded-2xl relative">
             <button onClick={()=>setUi(p=>({...p, modal:null}))} className="absolute top-4 right-4 text-gray-500 hover:text-white"><XCircle/></button>
             <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Sparkles className="text-purple-400"/> Vibe Match</h2>
             {!vibeResult ? <div className="py-12 text-center animate-pulse text-gray-500">Scanning multiverse...</div> : 
               <div className="space-y-3">
                  {vibeResult.map((r,i) => (
                    <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/10">
                       <div className="font-bold text-white">{r.title}</div>
                       <div className="text-xs text-gray-400 mt-1">{r.reason}</div>
                    </div>
                  ))}
               </div>
             }
          </div>
        </div>
      )}

      {ui.modal === 'focus' && ui.focusItem && (
         <div className="fixed inset-0 z-[60] bg-black flex items-center justify-center animate-[fadeIn_0.3s]">
            <button onClick={()=>setUi(p=>({...p, modal:null}))} className="absolute top-8 right-8 text-white/50 hover:text-white"><XCircle size={40}/></button>
            <div className="flex flex-col md:flex-row gap-8 items-center max-w-5xl w-full p-8">
               <div className="w-full md:w-1/3 aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl shadow-indigo-500/20 border border-white/10">{ui.focusItem.image ? <img src={ui.focusItem.image} className="w-full h-full object-cover"/> : <div className="w-full h-full bg-gray-800"/>}</div>
               <div className="flex-1 space-y-6">
                  <h1 className="text-5xl font-black text-white leading-tight">{ui.focusItem.title}</h1>
                  <div className="flex gap-3"><span className="px-3 py-1 bg-white/10 rounded text-sm font-bold">{ui.focusItem.studio || 'Unknown Studio'}</span><span className="px-3 py-1 bg-white/10 rounded text-sm font-bold">{ui.focusItem.source}</span><span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded text-sm font-bold">★ {ui.focusItem.rating}/10</span></div>
                  <p className="text-gray-400 text-lg italic">"{ui.focusItem.notes || 'No notes added yet.'}"</p>
                  <div className="flex gap-4 pt-4"><button onClick={()=>quickAdd(ui.focusItem.id, 1)} className="px-8 py-4 bg-white text-black font-bold rounded-xl hover:scale-105 transition-transform flex items-center gap-2"><Plus/> Mark Episode {ui.focusItem.currentEp + 1}</button><button onClick={()=>{setEditItem(ui.focusItem); setForm(ui.focusItem); setUi(p=>({...p, modal:'edit'}))}} className="px-8 py-4 border border-white/20 font-bold rounded-xl hover:bg-white/10 transition-colors">Edit</button></div>
               </div>
            </div>
         </div>
      )}

      {ui.modal === 'stats' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
           <div className="glass-panel w-full max-w-3xl p-8 rounded-3xl relative max-h-[90vh] overflow-y-auto">
              <button onClick={()=>setUi(p=>({...p, modal:null}))} className="absolute top-6 right-6"><XCircle/></button>
              <h2 className="text-3xl font-black mb-8 flex items-center gap-2"><BarChart2/> Analytics</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">{Object.entries({Days:stats.days, Completed:stats.completed, Total:stats.total, Genres:Object.keys(stats.genres).length}).map(([k,v])=><div key={k} className="bg-white/5 p-4 rounded-xl text-center"><div className="text-2xl font-black">{v}</div><div className="text-[10px] uppercase text-gray-500">{k}</div></div>)}</div>
              <div className="mb-8 p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-center"><h3 className="text-xs font-bold uppercase text-indigo-300 mb-2">Binge Forecast</h3><p className="text-sm">You have <span className="text-white font-bold">{Math.round(stats.remainingMins/60)} hours</span> left. Watch 3 hours/day to finish by <span className="text-white font-bold">{new Date(Date.now() + (stats.remainingMins/180)*86400000).toLocaleDateString()}</span>.</p></div>
              <div className="mb-8"><h3 className="text-xs font-bold uppercase text-gray-500 mb-3 flex items-center gap-2"><Activity size={14}/> Activity Heatmap (30 Days)</h3><div className="flex gap-1 flex-wrap">{[...Array(30)].map((_,i) => { const date = new Date(); date.setDate(date.getDate() - (29-i)); const dateStr = date.toISOString().split('T')[0]; const count = history.filter(h => h.d.startsWith(dateStr)).length; return <div key={i} className="w-4 h-4 rounded bg-indigo-500 transition-opacity" style={{opacity: count > 5 ? 1 : count > 0 ? 0.5 : 0.1}} title={`${dateStr}: ${count} actions`}/>})}</div></div>
           </div>
        </div>
      )}

      {ui.modal === 'edit' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-2xl p-6 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
             <div className="flex justify-between mb-6"><h2 className="text-xl font-bold flex gap-2">{editItem?<Edit2 color={primary}/>:<Plus color={primary}/>}{editItem?'Edit':'New'}</h2><button onClick={()=>setUi(p=>({...p, modal:null}))}><XCircle size={24}/></button></div>
             <form onSubmit={saveAnime} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                   <div className="space-y-4">
                      <div><label className="text-xs font-bold text-gray-500 uppercase">Title</label><input required autoFocus value={form.title} onChange={e=>setForm({...form,title:e.target.value})} className={`w-full px-4 py-2 ${currentStyle.input}`}/></div>
                      <div className="grid grid-cols-2 gap-4">
                         <div><label className="text-xs font-bold text-gray-500 uppercase">Status</label><select value={form.status} onChange={e=>setForm({...form,status:e.target.value})} className={`w-full px-4 py-2 ${currentStyle.input}`}><option value="watching">Watching</option><option value="completed">Completed</option><option value="planning">Planning</option><option value="dropped">Dropped</option></select></div>
                         <div><label className="text-xs font-bold text-gray-500 uppercase">Rating</label><input type="number" max="10" value={form.rating} onChange={e=>setForm({...form,rating:handleNumberInput(e.target.value)})} className={`w-full px-4 py-2 ${currentStyle.input}`}/></div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                         <div><label className="text-xs font-bold text-gray-500 uppercase">Eps</label><div className="flex gap-2"><input type="number" value={form.currentEp} onChange={e=>setForm({...form,currentEp:handleNumberInput(e.target.value)})} className={`w-full px-4 py-2 ${currentStyle.input}`}/><span className="text-gray-500 py-2">/</span><input type="number" value={form.totalEps} onChange={e=>setForm({...form,totalEps:handleNumberInput(e.target.value)})} className={`w-full px-4 py-2 ${currentStyle.input}`}/></div></div>
                         <div><label className="text-xs font-bold text-gray-500 uppercase">Priority</label><select value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})} className={`w-full px-4 py-2 ${currentStyle.input}`}><option>High</option><option>Medium</option><option>Low</option></select></div>
                      </div>
                   </div>
                   <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                         <div><label className="text-xs font-bold text-gray-500 uppercase">Studio</label><input value={form.studio} onChange={e=>setForm({...form,studio:e.target.value})} className={`w-full px-4 py-2 ${currentStyle.input}`}/></div>
                         <div><label className="text-xs font-bold text-gray-500 uppercase">Source</label><select value={form.source} onChange={e=>setForm({...form,source:e.target.value})} className={`w-full px-4 py-2 ${currentStyle.input}`}><option>Original</option><option>Manga</option><option>Light Novel</option><option>Game</option></select></div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                         <div><label className="text-xs font-bold text-gray-500 uppercase">Season</label><input value={form.season} onChange={e=>setForm({...form,season:e.target.value})} placeholder="Fall 2024" className={`w-full px-4 py-2 ${currentStyle.input}`}/></div>
                         <div><label className="text-xs font-bold text-gray-500 uppercase">Tags</label><div className="flex gap-2"><input value={form.tags} onChange={e=>setForm({...form,tags:e.target.value})} className={`w-full px-4 py-2 ${currentStyle.input}`} placeholder="Tags..."/><button type="button" onClick={handleAiTag} disabled={aiLoad} className="px-3 bg-indigo-600 rounded-lg hover:bg-indigo-500 disabled:opacity-50"><Sparkles size={16}/></button></div></div>
                      </div>
                      <div><label className="text-xs font-bold text-gray-500 uppercase">Image URL</label><input value={form.image} onChange={e=>setForm({...form,image:e.target.value})} className={`w-full px-4 py-2 ${currentStyle.input}`}/></div>
                      <div><label className="text-xs font-bold text-gray-500 uppercase flex justify-between">Notes <button type="button" onClick={handleAiReview} className="text-indigo-400 hover:text-white flex items-center gap-1 text-[10px]"><Sparkles size={10}/> Auto-Write</button></label><textarea rows="2" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} className={`w-full px-4 py-2 resize-none ${currentStyle.input}`}/></div>
                   </div>
                </div>
                <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                   <div className="flex items-center gap-4"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.favorite} onChange={e=>setForm({...form,favorite:e.target.checked})} className="w-4 h-4 accent-pink-500"/> Fav</label>{editItem && <button type="button" onClick={deleteAnime} className="text-red-400 hover:text-red-300 text-sm font-bold flex items-center gap-1"><Trash2 size={14}/> Delete</button>}</div>
                   <button type="submit" className="px-8 py-2 rounded-lg font-bold text-white shadow-lg" style={{background:primary}}>Save</button>
                </div>
             </form>
          </div>
        </div>
      )}

      {ui.modal === 'ai' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="glass-panel w-full max-w-2xl p-0 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[600px]">
             <div className="p-4 border-b border-white/10 flex justify-between bg-gradient-to-r from-indigo-900/50 to-purple-900/50 items-center">
                <div className="flex items-center gap-3"><Bot size={24} className="text-purple-300"/><div className="leading-tight"><h2 className="font-bold text-white">AniChat AI</h2></div></div>
                <button onClick={() => setUi(p=>({...p, modal:null}))}><XCircle size={24}/></button>
             </div>
             <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-black/20">
               {chatLog.map((c, i) => (
                 <div key={i} className={`flex flex-col gap-1 ${c.role==='user'?'items-end':'items-start'}`}>
                   <div className={`max-w-[85%] p-3 rounded-2xl text-sm whitespace-pre-wrap ${c.role==='user'?'bg-indigo-600 text-white rounded-tr-none':'bg-white/10 text-gray-200 rounded-tl-none'}`}>
                      {c.role === 'ai' ? <MarkdownRenderer content={c.text} /> : c.text}
                   </div>
                   {c.action && <div className={`text-[10px] px-2 py-1 rounded border flex items-center gap-1 ${c.action.type==='success'?'bg-green-900/30 border-green-500/30 text-green-400':'bg-red-900/30 border-red-500/30 text-red-400'}`}>{c.action.type==='success'?<CheckCircle size={10}/>:<AlertTriangle size={10}/>}{c.action.text}</div>}
                 </div>
               ))}
               {aiLoad && <div className="text-xs text-gray-400 animate-pulse">Thinking...</div>}
               <div ref={chatEndRef}/>
             </div>
             <div className="p-4 border-t border-white/10 bg-black/40">
               <form onSubmit={handleChat} className="flex gap-2"><input value={chatInput} onChange={e=>setChatInput(e.target.value)} placeholder="Ask anything..." className="flex-1 p-3 rounded-xl text-sm bg-black/50 border border-white/10 focus:border-indigo-500 outline-none"/><button type="submit" disabled={!chatInput.trim() || aiLoad} className="p-3 bg-indigo-600 rounded-xl"><Send size={18}/></button></form>
             </div>
          </div>
        </div>
      )}

      {ui.modal === 'settings' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
           <div className="glass-panel w-full max-w-xl p-6 rounded-2xl relative">
              <button onClick={() => setUi(p=>({...p, modal:null}))} className="absolute top-4 right-4"><XCircle/></button>
              <h2 className="text-xl font-bold mb-6">Config</h2>
              <div className="space-y-6">
                 <div><h3 className="text-xs font-bold text-gray-500 mb-2 uppercase">Theme</h3><div className="grid grid-cols-3 gap-2">{Object.entries(THEMES).map(([k, t]) => <button key={k} onClick={()=>setPrefs(p=>({...p, theme:k}))} className={`p-2 rounded border text-xs ${prefs.theme===k?'bg-white/20 border-white':'border-white/10'}`}>{t.label}</button>)}</div></div>
                 {prefs.theme === 'custom' && (
                    <div className="grid grid-cols-2 gap-4">
                       <div><label className="text-xs">Accent Color</label><input type="color" value={prefs.customPrimary} onChange={e=>setPrefs(p=>({...p, customPrimary:e.target.value}))} className="w-full h-8 rounded cursor-pointer"/></div>
                       <div><label className="text-xs">Background</label><input type="color" value={prefs.customBg} onChange={e=>setPrefs(p=>({...p, customBg:e.target.value}))} className="w-full h-8 rounded cursor-pointer"/></div>
                    </div>
                 )}
                 <div className="grid grid-cols-2 gap-4">
                    <button onClick={()=>setPrefs(p=>({...p, sound:!p.sound}))} className={`p-3 rounded border flex justify-between items-center ${prefs.sound?'bg-indigo-900/30 border-indigo-500':'border-white/10'}`}><span>Sounds</span>{prefs.sound?<Volume2 size={16}/>:<VolumeX size={16}/>}</button>
                    <button onClick={()=>{const h=JSON.stringify(animeList);const b=new Blob([h]);const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download='backup.json';a.click()}} className="p-3 rounded border flex justify-between items-center border-white/10 hover:bg-white/5"><span>Backup Data</span><Download size={16}/></button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

export default function AppWithBoundary() { return <ErrorBoundary><AniFlow /></ErrorBoundary>; }