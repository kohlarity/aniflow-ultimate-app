import React, { useState, useEffect, useMemo, Component, memo, useCallback, useRef } from 'react';
import { 
  Plus, Search, Tv, CheckCircle, Clock, XCircle, Edit2, Trash2, Star, TrendingUp, 
  LayoutGrid, List as ListIcon, Settings, Save, Upload, AlertTriangle, Palette, 
  Layout as LayoutIcon, Download, ExternalLink, Maximize2, Minimize2, Heart, 
  Shuffle, BarChart2, Filter, ChevronDown, Tag, Clock3, Volume2, VolumeX, Zap, 
  Eye, EyeOff, Layers, Film, Terminal, Sparkles, Bot, MessageSquare, Flame, History, Send,
  Database, Command, Globe, Grid, CheckSquare, Focus, Activity, Quote, Unlock, Lock, Calendar,
  BrainCircuit, RefreshCw, User, LogIn, LogOut, Clapperboard, Image as ImageIcon, RotateCcw
} from 'lucide-react';

// --- FIREBASE IMPORTS ---
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInAnonymously, signInWithPopup, GoogleAuthProvider, 
  signOut, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword
} from 'firebase/auth';
import { 
  getFirestore, collection, doc, setDoc, onSnapshot, 
  deleteDoc 
} from 'firebase/firestore';

// --- 1. SYSTEM CONFIGURATION ---
const apiKey = "AIzaSyDvvH0xVF2yCPXFV6aQNefETt7uXSzf3hc"; 

// 🔴 YOUR WEB APP'S FIREBASE CONFIGURATION (FOR CLOUD SAVE)
const firebaseConfig = {
  apiKey: "AIzaSyDh_M3Tf2lM6WfTH8V6gc8n9OOoCulW34g",
  authDomain: "aniflow-8371c.firebaseapp.com",
  projectId: "aniflow-8371c",
  storageBucket: "aniflow-8371c.firebasestorage.app",
  messagingSenderId: "261606232994",
  appId: "1:261606232994:web:53dee15be1edd4bc78d8fb",
  measurementId: "G-Y1W0946297"
};

// --- ULTIMATE GENRE LIST ---
const ULTIMATE_GENRES = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Slice of Life', 'Fantasy', 'Sci-Fi', 'Romance', 
  'Horror', 'Mystery', 'Thriller / Suspense', 'Psychological', 'Supernatural', 'Sports', 'Mecha', 
  'Shounen', 'Shoujo', 'Seinen', 'Josei', 'Kodomo', // Demographics
  'Isekai', 'Reverse Isekai', 'Post-Apocalyptic', 'Cyberpunk', 'Steampunk', 'Gothic', 'Historical', 
  'Alternate History', 'Space / Space Opera', 'Military', // Worldbuilding
  'Dark Fantasy', 'Tragedy', 'Wholesome', 'Feel-good', 'Gag / Parody', 'Surreal / Avant-garde', // Tone
  'Superpower', 'Magical Girl (Mahou Shoujo)', 'Martial Arts', 'Music / Idol', 'School', 'Workplace', 
  'Harem', 'Reverse Harem', 'Ecchi', 'Hentai', 'Gore / Splatter', 'Demons / Yokai', 'Vampire', 
  'Game / VRMMO', 'Racing', 'Cooking / Food', 'Detective', 'Medical', 'Psychic / ESP', 'Time Travel', // Themes
  'Chibi', 'Chuunibyou', 'Iyashikei', 'Kemono', 'CGI / 3D focus', // Style
  'Anthology', 'Short-form anime', 'Episodic', 'Long-running / Shounen Jump style', // Structure
  'Shounen-ai / Yaoi / BL', 'Shoujo-ai / Yuri / GL', 'Doujin / Fan-anime vibes' // Fandom
];

// --- FIREBASE INITIALIZATION (SAFE MODE) ---
let app, auth, db;
let useCloud = false;

if (firebaseConfig.apiKey && firebaseConfig.projectId) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    useCloud = true;
  } catch (e) {
    console.warn("Firebase Init Failed (Check Config):", e);
  }
}

async function callGemini(history, systemOverride) {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
    const tools = [{ google_search: {} }];
    const defaultSystem = `You are "AniChat", an anime expert. STYLE: Bullet points, concise, casual. Use **bold** for titles. AGENT: If user confirms adding, output: ||ADD:{"title":"X","totalEps":12,"tags":"Y"}||. If multiple, output multiple commands.`;
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
    if (this.state.hasError) return <div className="min-h-screen bg-black text-red-500 p-10 flex flex-col items-center justify-center text-center"><h1>SYSTEM FAILURE</h1><button onClick={() => {window.location.reload()}} className="bg-red-900/50 p-3 rounded text-white mt-4">HARD RESET</button></div>;
    return this.props.children; 
  }
}

// --- 2. OPTIMIZED COMPONENTS ---
const Card = memo(({ children, className = "", styleConfig }) => (<div className={`${styleConfig.card} overflow-hidden shadow-xl transition-all duration-300 ${className}`}>{children}</div>));
const Badge = memo(({ children, color = "blue", themeConfig }) => {
  let c = themeConfig.badge_blue;
  if (color === 'green') c = 'bg-green-500/20 text-green-300 border-green-500/30';
  if (color === 'red') c = 'bg-red-500/20 text-red-300 border-red-500/30';
  if (color === 'yellow') c = 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
  return (<span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wide ${c}`}>{children}</span>);
});

// --- 3. MAIN APP ---
function AniFlow() {
  // User & Data State
  const [user, setUser] = useState(null);
  const [animeList, setAnimeList] = useState([]);
  const [history, setHistory] = useState([]);
  const [prefs, setPrefs] = useState({ theme: 'cosmic', hue: 250, scale: 1, sound: true, zen: false, spoiler: false, tilt: true, density: 'normal', view: 'grid', showNotes: false, customPrimary: '#818cf8', customBg: '#0a0a0f' });
  
  // UI State
  const [ui, setUi] = useState({ tab: 'watching', search: '', sort: 'updated', modal: null, batchMode: false, selected: [], privacy: false, quote: "Loading...", settingsTab: 'general' });
  const [isLoaded, setIsLoaded] = useState(false);
  const [authError, setAuthError] = useState('');
  
  // Feature State
  const [editItem, setEditItem] = useState(null);
  const [toast, setToast] = useState(null);
  const [celebration, setCelebration] = useState(null);
  const [chatLog, setChatLog] = useState([{role: 'ai', text: "Yo! I'm **AniChat**. I can check the web and update your list! 🌍"}]);
  const [chatInput, setChatInput] = useState('');
  const [aiLoad, setAiLoad] = useState(false);
  const [genreResults, setGenreResults] = useState([]); 
  const [selectedGenre, setSelectedGenre] = useState(ULTIMATE_GENRES[0]);
  const [vibeResult, setVibeResult] = useState(null);
  const chatEndRef = useRef(null);

  const emptyForm = { title: '', status: 'watching', type: 'Series', currentEp: '', totalEps: '', duration: 24, rating: '', image: '', studio: '', source: 'Original', priority: 'Medium', notes: '', tags: '', season: '', favorite: false };
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

  // --- AUTH & DATA SYNC ---
  useEffect(() => {
    if (useCloud) {
      const unsub = onAuthStateChanged(auth, (u) => {
        setUser(u);
        if (u) showToast(`Logged in as ${u.isAnonymous ? 'Guest' : 'User'}`, 'success');
      });
      // Try to sign in anonymously if no user is found after init (ensures a UID for Firestore)
      if (!auth.currentUser) {
          signInAnonymously(auth).catch(e => console.error("Anonymous sign in failed:", e));
      }
      return () => unsub();
    }
  }, []);

  // Load Data (Local or Cloud)
  useEffect(() => {
    if (useCloud && user) {
       const unsubList = onSnapshot(collection(db, 'users', user.uid, 'animeList'), (snap) => {
          const list = snap.docs.map(d => ({id: d.id, ...d.data()}));
          setAnimeList(list.length > 0 ? list : []);
          setIsLoaded(true);
       }, (err) => console.error("Cloud Error, falling back", err));
       return () => unsubList();
    } else {
      // Local Storage Fallback
      const d = localStorage.getItem('af-data'); 
      if (d) { try { setAnimeList(JSON.parse(d)); } catch(e) { console.error("Data Corrupt"); } } 
      else { setAnimeList([{ id: 1, title: 'Akira', status: 'completed', type: 'Movie', currentEp: 124, totalEps: 124, duration: 124, rating: 10, studio: 'TMS', source: 'Manga', priority: 'High', tags: ['Sci-Fi', 'Classic'], addedAt: Date.now(), lastUpdated: Date.now() }]); }
      setIsLoaded(true);
    }
  }, [user]);

  // Helper to save data (Router between Cloud and Local)
  const persist = async (updatedList) => {
    setAnimeList(updatedList); // Optimistic update
    
    // 1. Always save to Local Storage as backup
    localStorage.setItem('af-data', JSON.stringify(updatedList));

    // 2. If Cloud is active, sync there too
    if (useCloud && user) {
       try {
         updatedList.forEach(async (item) => {
           await setDoc(doc(db, 'users', user.uid, 'animeList', String(item.id)), item);
         });
       } catch(e) { console.error("Cloud Save Error", e); }
    }
  };

  const deleteItem = async (id) => {
    const newList = animeList.filter(a => a.id !== id);
    setAnimeList(newList);
    localStorage.setItem('af-data', JSON.stringify(newList));
    
    if (useCloud && user) {
      await deleteDoc(doc(db, 'users', user.uid, 'animeList', String(id)));
    }
  };

  // Initialize other prefs
  useEffect(() => {
    const h = localStorage.getItem('af-hist'); if (h) setHistory(JSON.parse(h) || []);
    const p = localStorage.getItem('af-prefs'); if (p) setPrefs({...prefs, ...JSON.parse(p)});
    callGemini([{role: 'user', text: 'Give me one short, inspiring anime quote. Format: "Quote" - Character'}], "You are a quote generator.").then(r => setUi(p => ({...p, quote: r})));
  }, []);

  // Save Prefs
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

  // --- AUTH HANDLERS ---
  const handleEmailAuth = async (isSignUp, email, password) => {
    setAuthError('');
    if (!useCloud) return setAuthError("Cloud Save disabled. Please configure Firebase keys.");
    
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
        showToast("Account created! Welcome!", 'success');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        showToast("Logged in successfully!", 'success');
      }
      setUi(p => ({...p, modal: null}));
    } catch (error) {
      setAuthError(error.message.split('(auth/')[1]?.replace(').', '') || 'Authentication Failed');
    }
  };

  const handleAnonAuth = async () => {
    if (!useCloud) return showToast("Cloud Save is disabled. Add Firebase keys in App.jsx.", 'error');
    try {
        await signInAnonymously(auth);
        showToast("Signed in as Guest! Data now syncing to cloud.", 'success');
        setUi(p => ({...p, modal: null}));
    } catch (error) {
        setAuthError(error.message);
        showToast("Login Failed. Check console for details.", 'error');
    }
  };
  
  const handleLogout = () => signOut(auth);


  const showToast = (msg, type='success') => { setToast({msg, type}); setTimeout(()=>setToast(null), 3000); playSound(type==='success'?'success':'click'); };
  const log = (act) => setHistory(prev => [{t: act, d: new Date().toISOString()}, ...prev].slice(0, 100));
  const playSound = (type) => { if(!prefs.sound) return; const ctx=new(window.AudioContext||window.webkitAudioContext)(),o=ctx.createOscillator(),g=ctx.createGain();o.connect(g);g.connect(ctx.destination);const t=ctx.currentTime;if(type==='click'){o.frequency.setValueAtTime(800,t);o.frequency.exponentialRampToValueAtTime(400,t+.1);g.gain.setValueAtTime(.05,t);g.gain.exponentialRampToValueAtTime(.01,t+.1)}else{o.type='triangle';o.frequency.setValueAtTime(440,t);o.frequency.linearRampToValueAtTime(880,t+.1);g.gain.setValueAtTime(.05,t);g.gain.linearRampToValueAtTime(0,t+.3)}o.start();o.stop(t+.3); };
  const handleNumberInput = (val) => { if (val === '') return ''; const parsed = parseInt(val); return isNaN(parsed) ? '' : parsed; };
  const getRemaining = (c, t, d, type) => { 
    if (type === 'Movie') {
       if (!t || c >= t) return null;
       const left = t - c; 
       return left > 60 ? `${Math.floor(left/60)}h ${left%60}m` : `${left}m`;
    }
    if(!t || c>=t) return null; const m = (t-c)*(d||24); return m>60 ? `${Math.floor(m/60)}h ${m%60}m` : `${m}m`; 
  };

  const handleAdd = () => { setEditItem(null); setForm(emptyForm); setUi(p => ({...p, modal: 'edit'})); };
  
  const saveAnime = async (e) => {
    e.preventDefault();
    const clean = { 
      ...form, 
      currentEp: +form.currentEp||0, 
      totalEps: +form.totalEps||0, 
      rating: +form.rating||0, 
      duration: +form.duration||(form.type==='Movie'?120:24), 
      tags: typeof form.tags==='string'?form.tags.split(',').filter(t=>t.trim()):form.tags, 
      lastUpdated: Date.now() 
    };

    let newList = [...animeList];
    if (editItem) { 
      newList = newList.map(a => a.id === editItem.id ? { ...clean, id: a.id } : a);
      showToast('Updated!'); 
    } else { 
      newList = [...newList, { ...clean, id: Date.now(), addedAt: Date.now() }];
      showToast('Added!'); 
    }
    await persist(newList);
    setUi(p => ({...p, modal: null}));
  };

  const quickAdd = useCallback(async (id, amt) => {
    const item = animeList.find(a => a.id === id);
    if (!item) return;

    const next = (item.currentEp||0) + amt;
    const max = item.totalEps || 9999;
    let finished = false;
    let newStatus = item.status;
    
    if (item.status === 'planning') newStatus = 'watching';

    if (item.totalEps > 0 && next >= max) { 
      finished = true; 
      newStatus = 'completed';
    }
    
    if (finished && item.status !== 'completed') { 
      setCelebration(item.title); 
      setTimeout(()=>setCelebration(null), 3500); 
      log(`Completed ${item.title}`); 
      playSound('success');
    } else {
      log(`Watched ${item.title} +${amt}`);
      playSound('click');
    }

    const newItem = { ...item, currentEp: Math.min(next, max), status: newStatus, lastUpdated: Date.now() };
    
    const newList = animeList.map(a => a.id === id ? newItem : a);
    await persist(newList);

  }, [animeList, user]);

  const handleDelete = async () => { 
    if(confirm("Delete this anime?")) { 
       await deleteItem(editItem.id);
       setUi(p => ({...p, modal: null})); 
       showToast('Deleted', 'error'); 
    } 
  };

  const toggleSelect = (id) => setUi(p => ({...p, selected: p.selected.includes(id) ? p.selected.filter(i => i !== id) : [...p.selected, id]}));
  
  const fetchGenre = async (refresh = false) => {
    setAiLoad(true);
    const prompt = `List 5 unique anime recommendations for the genre "${selectedGenre}". Exclude popular mainstream ones like Naruto/One Piece if possible. Format strictly as JSON array: [{"title": "X", "episodes": 12, "studio": "Y", "desc": "Short summary"}]. Return ONLY JSON.`;
    const res = await callGemini([{role: 'user', text: prompt}], "You are a JSON generator API.");
    try {
       const data = JSON.parse(res.replace(/```json|```/g, ''));
       setGenreResults(refresh ? data : [...genreResults, ...data]); 
    } catch(e) { showToast("AI Parse Error", "error"); }
    setAiLoad(false);
  };

  const autoImage = async () => {
     if (!form.title) return showToast("Enter title first!", "error");
     setAiLoad(true);
     try {
       const r = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(form.title)}&limit=1`);
       const d = await r.json();
       if (d.data && d.data[0]) {
         setForm(p => ({ ...p, image: d.data[0].images.jpg.large_image_url }));
         showToast("Image found!", "success");
       } else showToast("No image found.", "error");
     } catch(e) { showToast("API Error", "error"); }
     setAiLoad(false);
  };

  const handleChat = async (e) => {
    e.preventDefault(); if (!chatInput.trim()) return;
    const msg = { role: 'user', text: chatInput }; setChatLog(p => [...p, msg]); setChatInput(''); setAiLoad(true);
    const res = await callGemini([...chatLog.slice(-4), msg]);
    const matches = [...res.matchAll(/\|\|ADD:(.*?)\|\|/g)];
    let action = null, cleanRes = res;
    
    if (matches.length > 0) {
      matches.forEach(match => {
        try { 
          const d = JSON.parse(match[1]); 
          if (!animeList.some(a => a.title.toLowerCase() === d.title.toLowerCase())) { 
            const newItem = { ...emptyForm, title: d.title, totalEps: d.totalEps||12, tags: d.tags?d.tags.split(','):[], status: 'planning', id: Date.now() + Math.random(), addedAt: Date.now() }; 
            persist([...animeList, newItem]); 
            action = { type: 'success', text: `Added ${d.title}` }; 
          } else action = { type: 'error', text: `${d.title} already exists.` }; 
        } catch (err) {} 
      });
      cleanRes = res.replace(/\|\|ADD:.*?\|\|/g, '').trim();
    }
    
    setChatLog(p => [...p, { role: 'ai', text: cleanRes, action }]); setAiLoad(false);
    chatEndRef.current?.scrollIntoView({behavior:'smooth'});
  };

  const exportCSV = () => {
    const h = animeList.length ? Object.keys(animeList[0]).join(',') : '';
    const r = animeList.map(a => Object.values(a).map(v => `"${v}"`).join(',')).join('\n');
    const b = new Blob([h + '\n' + r], { type: 'text/csv' });
    const u = URL.createObjectURL(b);
    const a = document.createElement('a'); a.href = u; a.download = 'aniflow.csv'; a.click();
  };

  const handleAiTag = async () => {
    if(!form.title) return showToast("Title needed!", "error"); setAiLoad(true);
    const r = await callGemini([{ role: 'user', text: `Return exactly 3 comma-separated genres for "${form.title}". No words.` }]);
    if(r) setForm(p => ({ ...p, tags: r.replace(/\./g, '').trim() })); setAiLoad(false);
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
      
      {celebration && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] pointer-events-none animate-[slideDown_0.5s_ease-out]">
          <div className="glass-panel px-8 py-4 rounded-full shadow-2xl border border-emerald-500/30 bg-emerald-900/80 backdrop-blur-xl flex items-center gap-4">
             <div className="p-2 bg-emerald-500 rounded-full animate-pulse"><CheckCircle className="text-black" size={24}/></div>
             <div><h1 className="text-xl font-black text-white tracking-tight uppercase">Completed!</h1><p className="text-emerald-200 text-xs font-mono">{celebration}</p></div>
          </div>
        </div>
      )}

      {toast && <div className="fixed bottom-8 right-8 z-[100] animate-[slideUp_0.3s_ease-out]"><div className="glass-panel px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-sm font-bold border-l-4" style={{borderLeftColor:primary}}>{toast.type==='success'?<CheckCircle size={16} color={primary}/>:<Zap size={16} color="#fbbf24"/>}{toast.msg}</div></div>}
      
      {!prefs.zen && (
        <nav className="sticky top-0 z-40 glass-panel border-b-0 border-b-white/5">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-xl"><Terminal size={20} style={{color:primary}}/><span className="tracking-tight">Ani<span style={{color:primary}}>Flow</span></span></div>
            <div className="hidden md:flex items-center gap-4 text-xs text-gray-400 font-mono bg-black/20 px-3 py-1 rounded-lg border border-white/5"><Quote size={12} className="text-gray-500"/> {ui.quote}</div>
            <div className="flex items-center gap-2">
              <button onClick={()=>setUi(p=>({...p, modal:'genre'}))} className="p-2 hover:bg-white/5 rounded-lg text-pink-400" title="Genre Explorer"><Globe size={18}/></button>
              <button onClick={()=>setUi(p=>({...p, modal:'ai'}))} className="p-2 hover:bg-white/5 rounded-lg text-indigo-400" title="AI Lab"><Bot size={18}/></button>
              <button onClick={()=>setUi(p=>({...p, modal:'settings'}))} className="p-2 hover:bg-white/5 rounded-lg"><Settings size={18}/></button>
              <button onClick={handleAdd} className="flex items-center gap-2 px-4 py-1.5 rounded-lg font-bold text-sm shadow-lg transition-all active:scale-95" style={{background:primary,color:'white'}}><Plus size={16}/> Add</button>
              
              {/* AUTH BUTTONS */}
              {user && <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} className="w-8 h-8 rounded-full border border-white/20 cursor-pointer" onClick={handleLogout}/>}
              {useCloud && !user && <button onClick={()=>setUi(p=>({...p, modal:'auth'}))} className="p-2 bg-white/10 rounded-lg text-xs font-bold">Log In</button>}
            </div>
          </div>
        </nav>
      )}
      {prefs.zen && <button onClick={() => setPrefs(p => ({...p, zen: false}))} className="fixed top-4 right-4 z-50 p-2 bg-black/50 rounded-full hover:bg-white/20 text-white transition-all"><Minimize2 size={24} /></button>}

      <main className={`max-w-7xl mx-auto px-4 py-8 transition-all duration-500 ${prefs.zen ? 'opacity-100' : ''}`}>
        {!prefs.zen && (
          <div className="flex flex-wrap gap-4 mb-8 justify-between items-center">
            <div className="flex gap-1 overflow-x-auto pb-2 no-scrollbar">
              {['watching','completed','planning','dropped','fav'].map(id => (
                <button key={id} onClick={()=>setUi(p=>({...p, tab:id}))} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold border capitalize transition-all ${ui.tab===id ? 'bg-white/10 border-white/20 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
                  {id==='fav'?<Heart size={14} color={ui.tab===id?primary:undefined}/>:<Tv size={14} color={ui.tab===id?primary:undefined}/>} {id}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
               <div className="relative group"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"/><input value={ui.search} onChange={e=>setUi(p=>({...p, search:e.target.value}))} placeholder="Search..." className={`pl-10 pr-4 py-1.5 rounded-lg text-sm focus:outline-none focus:ring-1 w-40 sm:w-64 ${currentStyle.input}`} style={{'--tw-ring-color':primary}}/></div>
               <select value={ui.sort} onChange={e=>setUi(p=>({...p, sort:e.target.value}))} className={`pl-3 pr-8 py-1.5 rounded-lg text-xs appearance-none cursor-pointer ${currentStyle.input}`}><option value="title">A-Z</option><option value="rating">Rating</option><option value="updated">Recent</option></select>
               <div className="flex bg-black/20 rounded-lg p-1 border border-white/5"><button onClick={()=>setPrefs(p=>({...p,view:'grid'}))} className={`p-1.5 rounded ${prefs.view==='grid'?'bg-white/10 text-white':'text-gray-500'}`}><LayoutGrid size={14}/></button><button onClick={()=>setPrefs(p=>({...p,view:'list'}))} className={`p-1.5 rounded ${prefs.view==='list'?'bg-white/10 text-white':'text-gray-500'}`}><ListIcon size={14}/></button></div>
            </div>
          </div>
        )}

        <div className={prefs.view==='grid' ? `grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` : 'flex flex-col gap-3'} style={prefs.view==='grid'?{gridTemplateColumns:`repeat(auto-fill, minmax(${250*prefs.scale}px, 1fr))`}:{}}>
          {filtered.map(a => (
            <div key={a.id} className={`${currentStyle.card} overflow-hidden group relative ${prefs.tilt?'tilt-card':''} ${ui.privacy?'privacy-blur':''} ${ui.batchMode && ui.selected.includes(a.id) ? 'ring-2 ring-indigo-500' : ''}`} onClick={() => ui.batchMode && toggleSelect(a.id)}>
              {prefs.view==='grid' ? (
                <>
                  <div className={`relative w-full bg-gray-800 overflow-hidden ${prefs.density==='compact'?'h-32':'h-48'}`}>
                    {a.image ? <img src={a.image} className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-110 group-hover:opacity-40 ${prefs.spoiler && a.status === 'planning' ? 'blur-md' : ''}`} /> : <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-white/5 to-transparent"><span className="text-4xl font-black text-white/10">{a.title.substring(0,2).toUpperCase()}</span></div>}
                    {!ui.batchMode && (
                      <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none group-hover:pointer-events-auto">
                        <button onClick={(e)=>{e.stopPropagation();quickAdd(a.id, a.type==='Movie'?10:1)}} className="p-3 bg-white text-black rounded-full hover:scale-110"><Plus size={20}/></button>
                        <button onClick={(e)=>{e.stopPropagation();setEditItem(a);setForm(a);setUi(p=>({...p, modal:'edit'}))}} className="p-3 bg-black/50 text-white rounded-full hover:bg-black hover:scale-110"><Edit2 size={20}/></button>
                        <button onClick={(e)=>{e.stopPropagation();setUi(p=>({...p, modal:'focus', focusItem:a}))}} className="p-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-500 hover:scale-110" title="Focus Mode"><Focus size={20}/></button>
                        <button onClick={(e)=>{e.stopPropagation();handleVibeCheck(a)}} className="p-3 bg-purple-600 text-white rounded-full hover:bg-purple-500 hover:scale-110" title="Vibe Match"><BrainCircuit size={20}/></button>
                      </div>
                    )}
                    <div className="absolute top-2 right-2 flex flex-col gap-1 items-end"><span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase backdrop-blur-md border bg-black/40 border-white/10`}>{a.status}</span>{a.type==='Movie'&&<span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/50 border border-white/10">MOVIE</span>}</div>
                    {a.favorite && <Heart size={16} className="absolute top-3 left-3 text-pink-500 drop-shadow-lg" fill="currentColor"/>}
                  </div>
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2"><h3 className="font-bold truncate text-sm pr-2" title={a.title}>{a.title}</h3>
                    {a.rating > 0 && (
                      <div className={`flex items-center gap-1 text-xs font-bold px-1.5 py-0.5 rounded ${a.rating<=4?'bg-red-900/40 text-red-300':a.rating<=6?'bg-yellow-900/40 text-yellow-300':'bg-green-900/40 text-green-300'}`}>
                        <Star size={10} fill="currentColor"/>{a.rating}
                      </div>
                    )}
                    </div>
                    <div className="mb-3 relative cursor-help group/p">
                      <div className="flex justify-between text-[10px] text-gray-400 mb-1 font-medium uppercase"><span>{a.type==='Movie'?`${a.currentEp}m / ${a.totalEps}m`:`Ep ${a.currentEp}/${a.totalEps||'?'}`}</span><span>{getRemaining(a.currentEp, a.totalEps, a.duration, a.type)}</span></div>
                      <div className="h-1 bg-gray-700 rounded-full overflow-hidden"><div className="h-full transition-all duration-500" style={{width:`${Math.min(((a.currentEp||0)/(a.totalEps||(a.type==='Movie'?120:24)))*100,100)}%`, background:primary}}></div></div>
                    </div>
                    {prefs.showNotes && a.notes && <div className="text-xs text-gray-500 italic truncate border-t border-white/5 pt-2 mt-2">"{a.notes}"</div>}
                  </div>
                </>
              ) : (
                <div className="flex items-center p-3 gap-4">
                   <div className="w-10 h-10 bg-gray-800 rounded overflow-hidden">{a.image?<img src={a.image} className="w-full h-full object-cover"/>:<div className="w-full h-full bg-white/5"/>}</div>
                   <div className="flex-1 min-w-0"><div className="flex items-center gap-2"><h3 className="font-bold text-sm">{a.title}</h3>{a.type==='Movie'&&<span className="text-[10px] px-1.5 bg-purple-900/50 rounded">Movie</span>}</div><div className="text-xs text-gray-500 flex gap-3"><span>{a.type==='Movie'?`${a.currentEp}m`:`Ep ${a.currentEp}`}</span><span>{a.rating?`★${a.rating}`:''}</span></div></div>
                   {!ui.batchMode && <div className="flex gap-2">
                      <button onClick={()=>quickAdd(a.id,1)} className="p-2 bg-white/5 hover:bg-white/10 rounded"><Plus size={14}/></button>
                      <button onClick={()=>{setEditItem(a);setForm(a);setUi(p=>({...p, modal:'edit'}))}} className="p-2 bg-white/5 hover:bg-white/10 rounded"><Edit2 size={14}/></button>
                   </div>}
                </div>
              )}
            </div>
          ))}
        </div>
      </main>

      {/* --- GENRE EXPLORER --- */}
      {ui.modal === 'genre' && (
         <div className="fixed inset-0 z-[70] bg-black/90 flex items-center justify-center p-4 animate-[fadeIn_0.2s]">
            <div className="glass-panel w-full max-w-4xl h-[600px] rounded-2xl flex flex-col relative">
               <button onClick={()=>setUi(p=>({...p, modal:null}))} className="absolute top-4 right-4 text-gray-500 hover:text-white"><XCircle/></button>
               <div className="p-6 border-b border-white/10 flex gap-4 items-center">
                  <h2 className="text-xl font-bold flex items-center gap-2"><Globe className="text-pink-400"/> Genre Explorer</h2>
                  <select className="bg-black/20 border border-white/10 rounded-lg p-2 text-sm" value={selectedGenre} onChange={e=>setSelectedGenre(e.target.value)}>
                     {ULTIMATE_GENRES.map(g=><option key={g} value={g}>{g}</option>)}
                  </select>
                  <button onClick={()=>fetchGenre(true)} disabled={aiLoad} className="p-2 bg-pink-600/20 text-pink-400 rounded-lg hover:bg-pink-600/40"><RefreshCw size={18} className={aiLoad?'animate-spin':''}/></button>
               </div>
               <div className="flex-1 p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {genreResults.map((r,i)=>(
                     <div key={i} className="bg-white/5 p-4 rounded-xl border border-white/5 hover:border-white/20 transition-all group">
                        <div className="flex justify-between mb-2"><h3 className="font-bold text-lg">{r.title}</h3><span className="text-xs bg-white/10 px-2 py-1 rounded">{r.episodes} eps</span></div>
                        <p className="text-xs text-gray-400 mb-4 line-clamp-3">{r.desc}</p>
                        <button onClick={()=>{persist([...animeList, {...emptyForm, title:r.title, totalEps:r.episodes, studio:r.studio, tags:[selectedGenre], status:'planning', id:Date.now()+Math.random(), addedAt:Date.now()}]); showToast('Added!')}} className="w-full py-2 bg-pink-600 text-white font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">Quick Add</button>
                     </div>
                  ))}
                  {genreResults.length === 0 && !aiLoad && <div className="col-span-full text-center text-gray-500 py-20">Select a genre and hit Refresh to explore.</div>}
               </div>
            </div>
         </div>
      )}

      {/* --- EDIT FORM --- */}
      {ui.modal === 'edit' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-2xl p-6 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
             <div className="flex justify-between mb-6"><h2 className="text-xl font-bold flex items-center gap-2">{editItem?<Edit2 color={primary}/>:<Plus color={primary}/>}{editItem?'Edit':'New'}</h2><button onClick={()=>setUi(p=>({...p, modal:null}))}><XCircle size={24}/></button></div>
             <form onSubmit={saveAnime} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                   <div className="space-y-4">
                      <div><label className="text-xs font-bold text-gray-500 uppercase">Title</label><input required autoFocus value={form.title} onChange={e=>setForm({...form,title:e.target.value})} className={`w-full px-4 py-2 ${currentStyle.input}`}/></div>
                      <div className="grid grid-cols-2 gap-4">
                         <div><label className="text-xs font-bold text-gray-500 uppercase">Format</label><select value={form.type} onChange={e=>setForm({...form,type:e.target.value})} className={`w-full px-4 py-2 ${currentStyle.input}`}><option>Series</option><option>Movie</option></select></div>
                         <div><label className="text-xs font-bold text-gray-500 uppercase">Status</label><select value={form.status} onChange={e=>setForm({...form,status:e.target.value})} className={`w-full px-4 py-2 ${currentStyle.input}`}><option value="watching">Watching</option><option value="completed">Completed</option><option value="planning">Planning</option><option value="dropped">Dropped</option></select></div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                         <div><label className="text-xs font-bold text-gray-500 uppercase">{form.type==='Movie'?'Minutes':'Episodes'}</label><div className="flex gap-2"><input type="number" value={form.currentEp} onChange={e=>setForm({...form,currentEp:handleNumberInput(e.target.value)})} className={`w-full px-4 py-2 ${currentStyle.input}`}/><span className="text-gray-500 py-2">/</span><input type="number" value={form.totalEps} onChange={e=>setForm({...form,totalEps:handleNumberInput(e.target.value)})} className={`w-full px-4 py-2 ${currentStyle.input}`}/></div></div>
                         <div><label className="text-xs font-bold text-gray-500 uppercase">Rating</label><input type="number" max="10" value={form.rating} onChange={e=>setForm({...form,rating:handleNumberInput(e.target.value)})} className={`w-full px-4 py-2 ${currentStyle.input}`}/></div>
                      </div>
                   </div>
                   <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                         <div><label className="text-xs font-bold text-gray-500 uppercase">Studio</label><input value={form.studio} onChange={e=>setForm({...form,studio:e.target.value})} className={`w-full px-4 py-2 ${currentStyle.input}`}/></div>
                         <div><label className="text-xs font-bold text-gray-500 uppercase">Source</label><select value={form.source} onChange={e=>setForm({...form,source:e.target.value})} className={`w-full px-4 py-2 ${currentStyle.input}`}><option>Original</option><option>Manga</option><option>Light Novel</option><option>Game</option></select></div>
                      </div>
                      <div>
                         <label className="text-xs font-bold text-gray-500 uppercase flex justify-between">Image URL <button type="button" onClick={autoImage} className="text-indigo-400 hover:text-white flex items-center gap-1 text-[10px]"><ImageIcon size={10}/> Auto-Find</button></label>
                         <input value={form.image} onChange={e=>setForm({...form,image:e.target.value})} className={`w-full px-4 py-2 ${currentStyle.input}`}/>
                      </div>
                      <div><label className="text-xs font-bold text-gray-500 uppercase flex justify-between">Notes <button type="button" onClick={handleAiReview} className="text-indigo-400 hover:text-white flex items-center gap-1 text-[10px]"><Sparkles size={10}/> Auto-Write</button></label><textarea rows="2" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} className={`w-full px-4 py-2 resize-none ${currentStyle.input}`}/></div>
                   </div>
                </div>
                <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                   <div className="flex items-center gap-4"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.favorite} onChange={e=>setForm({...form,favorite:e.target.checked})} className="w-4 h-4 accent-pink-500"/> Fav</label>{editItem && <button type="button" onClick={handleDelete} className="text-red-400 hover:text-red-300 text-sm font-bold flex items-center gap-1"><Trash2 size={14}/> Delete</button>}</div>
                   <button type="submit" className="px-8 py-2 rounded-lg font-bold text-white shadow-lg" style={{background:primary}}>Save</button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* --- AI MODAL --- */}
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

      {/* --- AUTH MODAL --- */}
      {ui.modal === 'auth' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <AuthModal primary={primary} authError={authError} setAuthError={setAuthError} handleEmailAuth={handleEmailAuth} handleAnonAuth={handleAnonAuth} closeModal={()=>setUi(p=>({...p, modal:null}))} />
        </div>
      )}

      {/* --- SETTINGS --- */}
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
                    <button onClick={()=>setPrefs(p=>({...p, showNotes:!p.showNotes}))} className={`p-3 rounded border flex justify-between items-center ${prefs.showNotes?'bg-indigo-900/30 border-indigo-500':'border-white/10'}`}><span>Card Notes</span>{prefs.showNotes?<Eye size={16}/>:<EyeOff size={16}/>}</button>
                 </div>
                 <div className="flex gap-2"><button onClick={()=>{const h=JSON.stringify(animeList);const b=new Blob([h]);const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download='backup.json';a.click()}} className="p-3 rounded border flex justify-between items-center border-white/10 hover:bg-white/5 flex-1"><span>Backup Data</span><Download size={16}/></button></div>
                 {user && <div className="text-xs text-gray-500 text-center">Logged in as {user.uid.slice(0,6)}...</div>}
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

// --- AUTH MODAL COMPONENT ---
const AuthModal = ({ primary, authError, setAuthError, handleEmailAuth, handleAnonAuth, closeModal }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    
    const handleSubmit = (e) => {
        e.preventDefault();
        handleEmailAuth(isSignUp, email, password);
    };

    return (
        <div className="glass-panel w-full max-w-sm p-6 rounded-2xl shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">{isSignUp ? 'Create Account' : 'Welcome Back'}</h2>
                <button onClick={closeModal}><XCircle size={24} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required className="w-full p-3 rounded-lg" />
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required className="w-full p-3 rounded-lg" />
                
                {authError && <p className="text-red-400 text-xs mt-2 p-2 bg-red-900/30 rounded">{authError}</p>}

                <button type="submit" className="w-full py-3 rounded-lg font-bold text-white" style={{ background: primary }}>
                    {isSignUp ? 'Sign Up' : 'Log In'}
                </button>
            </form>

            <div className="flex justify-between items-center text-xs">
                <button onClick={() => setIsSignUp(p => !p)} className="text-indigo-400 hover:underline">
                    {isSignUp ? 'Already have an account? Log In' : 'Need an account? Sign Up'}
                </button>
            </div>
            
            <div className="flex items-center my-3"><div className="flex-1 h-px bg-white/10"></div><span className="px-2 text-xs text-gray-500">OR</span><div className="flex-1 h-px bg-white/10"></div></div>

            <button onClick={handleAnonAuth} className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-bold flex items-center justify-center gap-2">
                <Unlock size={18} /> Continue as Guest
            </button>
        </div>
    );
};


export default function AppWithBoundary() { return <ErrorBoundary><AniFlow /></ErrorBoundary>; }