import { useState, useEffect, useRef } from 'react';
import { Search, Download, Play, Music, Video, Loader2, X, ChevronRight, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface VideoResult {
  videoId: string;
  title: string;
  thumbnail: string;
  author: { name: string };
  duration: { timestamp: string };
  views: number;
}

interface Format {
  quality: string;
  container: string;
  url: string;
  hasVideo: boolean;
  hasAudio: boolean;
  contentLength: string;
  mimeType: string;
  itag: number;
}

interface VideoInfo {
  title: string;
  thumbnail: string;
  duration: number;
  formats: Format[];
}

export default function App() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [results, setResults] = useState<VideoResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<VideoResult | null>(null);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [infoLoading, setInfoLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const searchRef = useRef<HTMLDivElement>(null);

  // Handle suggestions
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.length > 1) {
        try {
          const res = await fetch(`/api/suggestions?q=${encodeURIComponent(query)}`);
          const data = await res.json();
          setSuggestions(data);
          setShowSuggestions(true);
        } catch (error) {
          console.error('Suggestions error:', error);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Close suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = async (searchQuery: string = query) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setShowSuggestions(false);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setResults(data);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVideoSelect = async (video: VideoResult) => {
    setSelectedVideo(video);
    setVideoInfo(null);
    setInfoLoading(true);
    try {
      const res = await fetch(`/api/info?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${video.videoId}`)}`);
      const data = await res.json();
      setVideoInfo(data);
    } catch (error) {
      console.error('Info error:', error);
    } finally {
      setInfoLoading(false);
    }
  };

  const formatBytes = (bytes: string | undefined) => {
    if (!bytes) return 'Unknown size';
    const b = parseInt(bytes);
    if (isNaN(b)) return 'Unknown size';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = b;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const handleDownload = (format: Format) => {
    if (!selectedVideo) return;
    const filename = `${selectedVideo.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${format.container}`;
    const downloadUrl = `/api/download?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${selectedVideo.videoId}`)}&itag=${format.itag}&filename=${encodeURIComponent(filename)}`;
    window.location.href = downloadUrl;
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-orange-500 selection:text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.location.reload()}>
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <Play className="w-5 h-5 fill-white text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">TuneStream</span>
          </div>
          
          <div className="flex-1 max-w-2xl mx-8 relative" ref={searchRef}>
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 group-focus-within:text-orange-500 transition-colors" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search for music titles..."
                className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all placeholder:text-white/20"
              />
            </div>

            {/* Suggestions Dropdown */}
            <AnimatePresence>
              {showSuggestions && suggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a1a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-50"
                >
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setQuery(s);
                        handleSearch(s);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-white/5 flex items-center gap-3 transition-colors border-b border-white/5 last:border-0"
                    >
                      <Search className="w-3 h-3 text-white/20" />
                      <span className="text-sm text-white/80">{s}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="hidden md:flex items-center gap-4 text-sm font-medium text-white/60">
            <span className="hover:text-white cursor-pointer transition-colors">Discover</span>
            <span className="hover:text-white cursor-pointer transition-colors">Library</span>
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-500 to-pink-500 border border-white/20" />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Results Section */}
          <div className={`${selectedVideo ? 'lg:col-span-7' : 'lg:col-span-12'}`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold tracking-tight">
                {results.length > 0 ? 'Search Results' : 'Trending Now'}
              </h2>
              {loading && <Loader2 className="w-5 h-5 animate-spin text-orange-500" />}
            </div>

            <div className={`grid gap-4 ${selectedVideo ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
              {results.map((video) => (
                <motion.div
                  layout
                  key={video.videoId}
                  onClick={() => handleVideoSelect(video)}
                  className={`group relative bg-white/5 rounded-2xl overflow-hidden cursor-pointer border border-white/5 hover:border-orange-500/50 transition-all ${selectedVideo?.videoId === video.videoId ? 'ring-2 ring-orange-500' : ''}`}
                >
                  <div className="aspect-video relative overflow-hidden">
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
                    <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded text-[10px] font-bold">
                      {video.duration.timestamp}
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-orange-500 transition-colors">
                      {video.title}
                    </h3>
                    <p className="text-xs text-white/40 mt-1">{video.author.name}</p>
                  </div>
                </motion.div>
              ))}

              {results.length === 0 && !loading && (
                <div className="col-span-full py-20 text-center">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Music className="w-8 h-8 text-white/20" />
                  </div>
                  <p className="text-white/40">Search for your favorite tracks to get started</p>
                </div>
              )}
            </div>
          </div>

          {/* Player & Download Section */}
          <AnimatePresence>
            {selectedVideo && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="lg:col-span-5 space-y-6"
              >
                <div className="sticky top-24 space-y-6">
                  {/* Player */}
                  <div className="bg-[#1a1a1a] rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
                    <div className="aspect-video bg-black relative group">
                      <iframe
                        src={`https://www.youtube.com/embed/${selectedVideo.videoId}?autoplay=1`}
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                      <button
                        onClick={() => setSelectedVideo(null)}
                        className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/80 rounded-full backdrop-blur-md transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="p-6">
                      <h1 className="text-xl font-bold leading-tight mb-2">{selectedVideo.title}</h1>
                      <div className="flex items-center gap-4 text-sm text-white/40">
                        <span>{selectedVideo.author.name}</span>
                        <span>•</span>
                        <span>{selectedVideo.duration.timestamp}</span>
                      </div>
                    </div>
                  </div>

                  {/* Download Options */}
                  <div className="bg-[#1a1a1a] rounded-3xl border border-white/10 p-6 space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold flex items-center gap-2">
                        <Download className="w-5 h-5 text-orange-500" />
                        Download Options
                      </h3>
                      {infoLoading && <Loader2 className="w-4 h-4 animate-spin text-orange-500" />}
                    </div>

                    {!infoLoading && videoInfo ? (
                      <div className="space-y-4">
                        {/* Audio Section */}
                        <div>
                          <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3">Audio Only</p>
                          <div className="grid gap-2">
                            {videoInfo.formats
                              .filter(f => !f.hasVideo && f.hasAudio)
                              .slice(0, 3)
                              .map((f, i) => (
                                <button
                                  key={i}
                                  onClick={() => handleDownload(f)}
                                  className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-orange-500/10 border border-white/5 hover:border-orange-500/50 rounded-xl transition-all group"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center group-hover:bg-orange-500 transition-colors">
                                      <Music className="w-4 h-4 text-orange-500 group-hover:text-white" />
                                    </div>
                                    <div className="text-left">
                                      <p className="text-sm font-semibold">{f.quality}</p>
                                      <p className="text-[10px] text-white/40">{f.container.toUpperCase()} • {formatBytes(f.contentLength)}</p>
                                    </div>
                                  </div>
                                  <Download className="w-4 h-4 text-white/20 group-hover:text-orange-500 transition-colors" />
                                </button>
                              ))}
                          </div>
                        </div>

                        {/* Video Section */}
                        <div>
                          <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3">Video + Audio</p>
                          <div className="grid gap-2">
                            {videoInfo.formats
                              .filter(f => f.hasVideo && f.hasAudio)
                              .sort((a, b) => parseInt(b.quality) - parseInt(a.quality))
                              .slice(0, 3)
                              .map((f, i) => (
                                <button
                                  key={i}
                                  onClick={() => handleDownload(f)}
                                  className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-orange-500/10 border border-white/5 hover:border-orange-500/50 rounded-xl transition-all group"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center group-hover:bg-orange-500 transition-colors">
                                      <Video className="w-4 h-4 text-orange-500 group-hover:text-white" />
                                    </div>
                                    <div className="text-left">
                                      <p className="text-sm font-semibold">{f.quality}</p>
                                      <p className="text-[10px] text-white/40">{f.container.toUpperCase()} • {formatBytes(f.contentLength)}</p>
                                    </div>
                                  </div>
                                  <Download className="w-4 h-4 text-white/20 group-hover:text-orange-500 transition-colors" />
                                </button>
                              ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      !infoLoading && (
                        <div className="py-12 text-center text-white/20">
                          <Info className="w-8 h-8 mx-auto mb-2 opacity-20" />
                          <p className="text-sm">Select a video to see download options</p>
                        </div>
                      )
                    )}

                    {infoLoading && (
                      <div className="py-12 flex flex-col items-center justify-center gap-4">
                        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                        <p className="text-sm text-white/40 animate-pulse">Extracting formats...</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t border-white/10 py-12 bg-[#050505]">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 bg-orange-500 rounded flex items-center justify-center">
                <Play className="w-4 h-4 fill-white text-white" />
              </div>
              <span className="text-lg font-bold tracking-tight">TuneStream</span>
            </div>
            <p className="text-sm text-white/40 max-w-sm">
              The ultimate music companion. Search, play, and download your favorite tracks from across the web.
              Built for speed and simplicity.
            </p>
          </div>
          <div>
            <h4 className="font-bold mb-4">Product</h4>
            <ul className="space-y-2 text-sm text-white/40">
              <li className="hover:text-white cursor-pointer transition-colors">Features</li>
              <li className="hover:text-white cursor-pointer transition-colors">Mobile App</li>
              <li className="hover:text-white cursor-pointer transition-colors">Browser Extension</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4">Support</h4>
            <ul className="space-y-2 text-sm text-white/40">
              <li className="hover:text-white cursor-pointer transition-colors">Help Center</li>
              <li className="hover:text-white cursor-pointer transition-colors">Terms of Service</li>
              <li className="hover:text-white cursor-pointer transition-colors">Privacy Policy</li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 mt-12 pt-8 border-t border-white/5 text-center text-xs text-white/20">
          © 2026 TuneStream. All rights reserved. For educational purposes only.
        </div>
      </footer>
    </div>
  );
}