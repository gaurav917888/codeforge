'use client';
import { useEffect, useRef, useState } from 'react';
import { Bookmark, PictureInPicture2, X, Info, ChevronLeft, ChevronRight } from 'lucide-react';

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export default function VideoPlayer({ file, url, siblings = [], onNavigate, onClose }) {
  const videoRef = useRef(null);
  const [speed, setSpeed] = useState(1);
  const [bookmarks, setBookmarks] = useState([]);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const storageKey = `vault_video_progress_${file.id}`;
  const bookmarksKey = `vault_video_bookmarks_${file.id}`;

  const idx = siblings.findIndex((f) => f.id === file.id);
  const canPrev = idx > 0;
  const canNext = idx < siblings.length - 1 && idx !== -1;

  useEffect(() => {
    try {
      const bm = JSON.parse(localStorage.getItem(bookmarksKey) || '[]');
      setBookmarks(bm);
    } catch (e) {
      console.warn(e);
    }
  }, [bookmarksKey]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const saved = parseFloat(localStorage.getItem(storageKey) || '0');
    const onLoaded = () => {
      if (saved && saved < v.duration - 5) v.currentTime = saved;
      v.playbackRate = speed;
    };
    const onTime = () => {
      if (v.currentTime > 3) localStorage.setItem(storageKey, String(v.currentTime));
    };
    v.addEventListener('loadedmetadata', onLoaded);
    v.addEventListener('timeupdate', onTime);
    return () => {
      v.removeEventListener('loadedmetadata', onLoaded);
      v.removeEventListener('timeupdate', onTime);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, file.id]);

  /* keyboard: Escape to close, ←/→ to slide between videos */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
      if (e.key === 'ArrowLeft' && canPrev) onNavigate?.(siblings[idx - 1]);
      if (e.key === 'ArrowRight' && canNext) onNavigate?.(siblings[idx + 1]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [idx, siblings, canPrev, canNext, onClose, onNavigate]);

  const changeSpeed = (s) => {
    setSpeed(s);
    if (videoRef.current) videoRef.current.playbackRate = s;
  };

  const togglePip = async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await v.requestPictureInPicture();
    } catch (e) { console.error(e); }
  };

  const addBookmark = () => {
    const v = videoRef.current;
    if (!v) return;
    const label = prompt('Bookmark label (optional):', `Mark @ ${formatTime(v.currentTime)}`);
    if (label === null) return;
    const bm = [...bookmarks, { time: v.currentTime, label: label || formatTime(v.currentTime) }];
    setBookmarks(bm);
    localStorage.setItem(bookmarksKey, JSON.stringify(bm));
  };

  const jumpTo = (t) => { if (videoRef.current) videoRef.current.currentTime = t; };
  const deleteBookmark = (i) => {
    const bm = bookmarks.filter((_, idx2) => idx2 !== i);
    setBookmarks(bm);
    localStorage.setItem(bookmarksKey, JSON.stringify(bm));
  };

  return (
    <div className="relative w-full h-full flex flex-col" style={{ background: '#0b0b0b' }}>
      <div className="flex items-center justify-between px-3 py-2 flex-shrink-0" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
        <div className="flex items-center gap-2 min-w-0">
          <div className="text-white font-medium truncate text-sm">{file.name}</div>
          {siblings.length > 1 && (
            <div className="text-xs text-white/60 whitespace-nowrap">{idx + 1} / {siblings.length}</div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-1 mr-2">
            <span className="text-xs text-white/60">Speed</span>
            <select
              value={speed}
              onChange={(e) => changeSpeed(parseFloat(e.target.value))}
              className="bg-transparent text-white text-xs border border-white/20 rounded px-2 py-1"
            >
              {SPEEDS.map((s) => <option key={s} value={s} className="bg-black">{s}×</option>)}
            </select>
          </div>
          <IconBtn onClick={addBookmark} title="Add bookmark"><Bookmark size={16} /></IconBtn>
          <IconBtn onClick={() => setShowBookmarks((s) => !s)} title="Show bookmarks"><Info size={16} /></IconBtn>
          <IconBtn onClick={togglePip} title="Picture in Picture"><PictureInPicture2 size={16} /></IconBtn>
          <IconBtn onClick={onClose} title="Close"><X size={16} /></IconBtn>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center relative">
        {canPrev && (
          <button onClick={() => onNavigate?.(siblings[idx - 1])} className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full hover:bg-white/10" style={{ background: 'rgba(0,0,0,0.4)' }} title="Previous video">
            <ChevronLeft size={24} color="white" />
          </button>
        )}
        {canNext && (
          <button onClick={() => onNavigate?.(siblings[idx + 1])} className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full hover:bg-white/10" style={{ background: 'rgba(0,0,0,0.4)' }} title="Next video">
            <ChevronRight size={24} color="white" />
          </button>
        )}

        <video ref={videoRef} src={url} controls className="max-w-full max-h-full" autoPlay />
        {showBookmarks && (
          <div className="absolute top-4 left-4 w-64 p-4 rounded-xl text-white text-sm" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)' }}>
            <div className="font-semibold mb-2 flex justify-between">
              <span>Bookmarks</span>
              <button onClick={() => setShowBookmarks(false)}><X size={14} /></button>
            </div>
            {bookmarks.length === 0 && <p className="text-white/50 text-xs">No bookmarks yet. Click the bookmark icon above to add one.</p>}
            {bookmarks.map((bm, i) => (
              <div key={i} className="flex items-center gap-2 py-1.5 border-t border-white/10">
                <button onClick={() => jumpTo(bm.time)} className="flex-1 text-left text-xs hover:text-white text-white/80">
                  <div className="font-medium">{bm.label}</div>
                  <div className="text-white/50">{formatTime(bm.time)}</div>
                </button>
                <button onClick={() => deleteBookmark(i)} className="text-white/50 hover:text-white">
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function IconBtn({ children, onClick, title }) {
  return (
    <button onClick={onClick} title={title} className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-all">
      {children}
    </button>
  );
}

function formatTime(sec) {
  if (!sec || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}
