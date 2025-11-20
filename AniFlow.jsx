import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Tv, 
  CheckCircle, 
  Clock, 
  XCircle, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  Star, 
  TrendingUp,
  LayoutGrid,
  List as ListIcon
} from 'lucide-react';

// --- Components ---

const Card = ({ children, className = "" }) => (
  <div className={`bg-gray-900/60 backdrop-blur-md border border-white/5 rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-300 hover:-translate-y-1 ${className}`}>
    {children}
  </div>
);

const Badge = ({ children, color = "blue" }) => {
  const colors = {
    blue: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    green: "bg-green-500/20 text-green-300 border-green-500/30",
    purple: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    red: "bg-red-500/20 text-red-300 border-red-500/30",
    yellow: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  };
  return (
    <span className={`px-2 py-1 rounded-md text-xs font-medium border ${colors[color] || colors.blue}`}>
      {children}
    </span>
  );
};

const Button = ({ children, onClick, variant = "primary", className = "", icon: Icon }) => {
  const baseStyle = "flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all duration-200 active:scale-95";
  const variants = {
    primary: "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-indigo-500/20",
    secondary: "bg-gray-800 hover:bg-gray-700 text-gray-200 border border-white/5",
    danger: "bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20",
    ghost: "bg-transparent hover:bg-white/5 text-gray-400 hover:text-white",
  };

  return (
    <button onClick={onClick} className={`${baseStyle} ${variants[variant]} ${className}`}>
      {Icon && <Icon size={18} />}
      {children}
    </button>
  );
};

// --- Main App ---

export default function AniFlow() {
  // State
  const [animeList, setAnimeList] = useState([]);
  const [activeTab, setActiveTab] = useState('watching');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAnime, setEditingAnime] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    status: 'watching',
    currentEp: 0,
    totalEps: 12,
    rating: 0,
    image: ''
  });

  // Load Data
  useEffect(() => {
    const saved = localStorage.getItem('aniflow-data');
    if (saved) {
      setAnimeList(JSON.parse(saved));
    } else {
      // Default Mock Data if empty
      setAnimeList([
        { id: 1, title: 'Jujutsu Kaisen', status: 'watching', currentEp: 14, totalEps: 24, rating: 9, image: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=800&q=80' },
        { id: 2, title: 'Cyberpunk: Edgerunners', status: 'completed', currentEp: 10, totalEps: 10, rating: 10, image: 'https://images.unsplash.com/photo-1535498730771-e735b998cd64?auto=format&fit=crop&w=800&q=80' },
      ]);
    }
  }, []);

  // Save Data
  useEffect(() => {
    localStorage.setItem('aniflow-data', JSON.stringify(animeList));
  }, [animeList]);

  // CRUD Operations
  const handleAdd = () => {
    setEditingAnime(null);
    setFormData({ title: '', status: 'watching', currentEp: 0, totalEps: 12, rating: 0, image: '' });
    setIsModalOpen(true);
  };

  const handleEdit = (anime) => {
    setEditingAnime(anime);
    setFormData({ ...anime });
    setIsModalOpen(true);
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this anime?")) {
      setAnimeList(animeList.filter(a => a.id !== id));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingAnime) {
      setAnimeList(animeList.map(a => a.id === editingAnime.id ? { ...formData, id: a.id } : a));
    } else {
      setAnimeList([...animeList, { ...formData, id: Date.now() }]);
    }
    setIsModalOpen(false);
  };

  const quickIncrement = (e, id) => {
    e.stopPropagation();
    setAnimeList(animeList.map(a => {
      if (a.id === id) {
        // Auto-move to completed if max reached
        const nextEp = a.currentEp + 1;
        const isFinished = a.totalEps > 0 && nextEp >= a.totalEps;
        return { 
          ...a, 
          currentEp: Math.min(nextEp, a.totalEps || 9999),
          status: isFinished ? 'completed' : a.status
        };
      }
      return a;
    }));
  };

  // Filtering
  const filteredList = useMemo(() => {
    return animeList
      .filter(a => a.status === activeTab)
      .filter(a => a.title.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [animeList, activeTab, searchQuery]);

  const stats = useMemo(() => {
    return {
      total: animeList.length,
      watching: animeList.filter(a => a.status === 'watching').length,
      completed: animeList.filter(a => a.status === 'completed').length,
    };
  }, [animeList]);

  const tabs = [
    { id: 'watching', label: 'Watching', icon: Tv, color: 'text-blue-400' },
    { id: 'completed', label: 'Completed', icon: CheckCircle, color: 'text-green-400' },
    { id: 'planning', label: 'Planning', icon: Clock, color: 'text-yellow-400' },
    { id: 'dropped', label: 'Dropped', icon: XCircle, color: 'text-red-400' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-gray-100 font-sans selection:bg-indigo-500/30">
      
      {/* Navbar */}
      <nav className="sticky top-0 z-40 backdrop-blur-xl bg-[#0a0a0f]/80 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <TrendingUp size={18} className="text-white" />
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                AniFlow
              </span>
            </div>

            {/* Search Bar - Desktop */}
            <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
              <div className="relative w-full group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
                <input 
                  type="text" 
                  placeholder="Search your library..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-900/50 border border-white/10 rounded-xl py-2 pl-10 pr-4 focus:outline-none focus:border-indigo-500/50 focus:bg-gray-900 transition-all placeholder:text-gray-600"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
               <div className="hidden sm:flex items-center gap-4 mr-4 text-xs font-medium text-gray-500">
                  <div className="flex items-center gap-1"><Tv size={14} /> <span>{stats.watching}</span></div>
                  <div className="flex items-center gap-1"><CheckCircle size={14} /> <span>{stats.completed}</span></div>
               </div>
               <Button onClick={handleAdd} icon={Plus} className="shadow-xl shadow-indigo-500/20">
                 <span className="hidden sm:inline">Add Anime</span>
                 <span className="sm:hidden">Add</span>
               </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap
                ${activeTab === tab.id 
                  ? 'bg-white/10 text-white shadow-lg shadow-white/5 border border-white/10' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
            >
              <tab.icon size={16} className={activeTab === tab.id ? tab.color : ''} />
              {tab.label}
              <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === tab.id ? 'bg-white/20' : 'bg-white/5'}`}>
                {animeList.filter(a => a.status === tab.id).length}
              </span>
            </button>
          ))}
          
          <div className="ml-auto hidden sm:flex bg-gray-900/50 rounded-lg p-1 border border-white/5">
            <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white'}`}>
              <LayoutGrid size={16} />
            </button>
            <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white'}`}>
              <ListIcon size={16} />
            </button>
          </div>
        </div>

        {/* Search - Mobile */}
        <div className="md:hidden mb-6 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input 
              type="text" 
              placeholder="Search..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-900/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-indigo-500/50"
            />
        </div>

        {/* Anime Grid */}
        {filteredList.length === 0 ? (
          <div className="text-center py-20 opacity-50 flex flex-col items-center animate-pulse">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4">
              <Search size={32} />
            </div>
            <p className="text-xl font-medium">Nothing here yet.</p>
            <p className="text-sm mt-2">Time to start a new adventure!</p>
          </div>
        ) : (
          <div className={viewMode === 'grid' 
            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" 
            : "flex flex-col gap-3"
          }>
            {filteredList.map(anime => (
              <Card key={anime.id} className="group relative bg-gray-800/40 hover:bg-gray-800/60">
                {viewMode === 'grid' ? (
                  // Grid View
                  <>
                    <div className="h-40 w-full bg-gray-800 relative overflow-hidden group-hover:h-36 transition-all duration-300">
                       {anime.image ? (
                         <img src={anime.image} alt={anime.title} className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity duration-300" />
                       ) : (
                         <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                            <Tv className="text-white/10" size={48} />
                         </div>
                       )}
                       <div className="absolute top-3 right-3">
                         <Badge color={
                           anime.status === 'watching' ? 'blue' : 
                           anime.status === 'completed' ? 'green' : 
                           anime.status === 'dropped' ? 'red' : 'yellow'
                         }>
                           {anime.status}
                         </Badge>
                       </div>
                    </div>
                    
                    <div className="p-5">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-lg truncate pr-4">{anime.title}</h3>
                        {anime.rating > 0 && (
                          <div className="flex items-center gap-1 text-yellow-400 text-xs font-bold bg-yellow-400/10 px-2 py-1 rounded-md">
                            <Star size={10} fill="currentColor" /> {anime.rating}
                          </div>
                        )}
                      </div>

                      <div className="mb-4">
                         <div className="flex justify-between text-xs text-gray-400 mb-1.5 font-medium">
                           <span>Progress</span>
                           <span>{anime.currentEp} / {anime.totalEps || '?'}</span>
                         </div>
                         <div className="h-1.5 bg-gray-700/50 rounded-full overflow-hidden">
                           <div 
                             className={`h-full rounded-full transition-all duration-500 ${anime.status === 'completed' ? 'bg-green-500' : 'bg-indigo-500'}`}
                             style={{ width: `${Math.min((anime.currentEp / (anime.totalEps || 24)) * 100, 100)}%` }}
                           />
                         </div>
                      </div>

                      <div className="flex gap-2 mt-4 pt-4 border-t border-white/5">
                         <button 
                            onClick={(e) => quickIncrement(e, anime.id)}
                            className="flex-1 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-colors"
                         >
                           <Plus size={14} /> 1 Ep
                         </button>
                         <button onClick={() => handleEdit(anime)} className="p-2 hover:bg-white/5 text-gray-400 hover:text-white rounded-lg transition-colors">
                           <Edit2 size={14} />
                         </button>
                         <button onClick={() => handleDelete(anime.id)} className="p-2 hover:bg-red-500/10 text-gray-400 hover:text-red-400 rounded-lg transition-colors">
                           <Trash2 size={14} />
                         </button>
                      </div>
                    </div>
                  </>
                ) : (
                  // List View
                  <div className="flex items-center p-4 gap-4">
                    <div className="w-12 h-12 rounded-lg bg-gray-800 flex-shrink-0 overflow-hidden">
                       {anime.image ? (
                         <img src={anime.image} alt="" className="w-full h-full object-cover" />
                       ) : (
                         <div className="w-full h-full flex items-center justify-center bg-gray-700"><Tv size={16} /></div>
                       )}
                    </div>
                    <div className="flex-1 min-w-0">
                       <h3 className="font-bold text-sm truncate">{anime.title}</h3>
                       <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                         <span>Ep {anime.currentEp}/{anime.totalEps || '?'}</span>
                         {anime.rating > 0 && <span className="flex items-center gap-0.5 text-yellow-500"><Star size={10} fill="currentColor" /> {anime.rating}</span>}
                       </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={(e) => quickIncrement(e, anime.id)}
                            className="w-8 h-8 rounded-full bg-white/5 hover:bg-indigo-500/20 hover:text-indigo-400 flex items-center justify-center transition-colors"
                         >
                           <Plus size={14} />
                         </button>
                         <div className="h-4 w-px bg-white/10 mx-1"></div>
                         <button onClick={() => handleEdit(anime)} className="text-gray-500 hover:text-white"><Edit2 size={14} /></button>
                         <button onClick={() => handleDelete(anime.id)} className="text-gray-500 hover:text-red-400"><Trash2 size={14} /></button>
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#1a1b23] border border-white/10 w-full max-w-md rounded-2xl p-6 shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">
                {editingAnime ? 'Edit Anime' : 'Track New Anime'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-white transition-colors">
                <XCircle size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 uppercase mb-1.5">Title</label>
                <input 
                  required
                  autoFocus
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="e.g. Attack on Titan"
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-xs font-medium text-gray-400 uppercase mb-1.5">Status</label>
                   <select 
                     className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none appearance-none"
                     value={formData.status}
                     onChange={e => setFormData({...formData, status: e.target.value})}
                   >
                     <option value="watching">Watching</option>
                     <option value="completed">Completed</option>
                     <option value="planning">Planning</option>
                     <option value="dropped">Dropped</option>
                   </select>
                </div>
                <div>
                   <label className="block text-xs font-medium text-gray-400 uppercase mb-1.5">Rating (1-10)</label>
                   <input 
                    type="number" min="0" max="10"
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none"
                    value={formData.rating}
                    onChange={e => setFormData({...formData, rating: parseInt(e.target.value) || 0})}
                   />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-xs font-medium text-gray-400 uppercase mb-1.5">Current Ep</label>
                   <input 
                    type="number" min="0"
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none"
                    value={formData.currentEp}
                    onChange={e => setFormData({...formData, currentEp: parseInt(e.target.value) || 0})}
                   />
                </div>
                <div>
                   <label className="block text-xs font-medium text-gray-400 uppercase mb-1.5">Total Ep</label>
                   <input 
                    type="number" min="0"
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none"
                    value={formData.totalEps}
                    onChange={e => setFormData({...formData, totalEps: parseInt(e.target.value) || 0})}
                   />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 uppercase mb-1.5">Image URL (Optional)</label>
                <input 
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none"
                  placeholder="https://..."
                  value={formData.image}
                  onChange={e => setFormData({...formData, image: e.target.value})}
                />
              </div>

              <div className="pt-4">
                <Button className="w-full py-3 text-sm">
                  {editingAnime ? 'Save Changes' : 'Add to Library'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}