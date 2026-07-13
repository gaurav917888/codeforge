'use client';
import { useEffect, useRef, useState } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, Maximize2, Minimize2, Play, Pause, ChevronLeft, ChevronRight, Info } from 'lucide-react';

export default function ImageViewer({ file, url, siblings = [], onNavigate, onClose }) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [showInfo, setShowInfo] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [slideshow, setSlideshow] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef(null);

  const idx = siblings.findIndex((f) => f.id === file.id);
  const canPrev = idx > 0;
  const canNext = idx < siblings.length - 1 && idx !== -1;

  const reset = () => { setZoom(1); setRotation(0); setPos({ x: 0, y: 0 }); };

  useEffect(() => { reset(); }, [file.id]);

  useEffect(() => {
    if (!slideshow || !canNext) return;
    const t = setTimeout(() => onNavigate?.(siblings[idx + 1]), 3000);
    return () => clearTimeout(t);
  }, [slideshow, canNext, idx, siblings, onNavigate]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
      if (e.key === 'ArrowLeft' && canPrev) onNavigate?.(siblings[idx - 1]);
      if (e.key === 'ArrowRight' && canNext) onNavigate?.(siblings[idx + 1]);
      if (e.key === '+' || e.key === '=') setZoom((z) => Math.min(5, z + 0.25));
      if (e.key === '-') setZoom((z) => Math.max(0.25, z - 0.25));
      if (e.key === 'r' || e.key === 'R') setRotation((r) => r + 90);
      if (e.key === '0') reset();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [idx, siblings, canPrev, canNext, onClose, onNavigate]);

  const toggleFullscreen = async () => {
    if (!fullscreen) {
      await containerRef.current?.requestFullscreen?.();
      setFullscreen(true);
    } else {
      await document.exitFullscreen?.();
      setFullscreen(false);
    }
  };

  const onWheel = (e) => {
    e.preventDefault();
    setZoom((z) => Math.min(5, Math.max(0.25, z - e.deltaY * 0.002)));
  };

  const onMouseDown = (e) => {
    if (zoom <= 1) return;
    setDragging(true);
    dragStart.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
  };
  const onMouseMove = (e) => {
    if (!dragging) return;
    setPos({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
  };
  const onMouseUp = () => setDragging(false);

  return (
    <div ref={containerRef} className="relative w-full h-full flex flex-col" style={{ background: '#0b0b0b' }}>
      {/* Top toolbar — viewer-specific controls only */}
      <div className="flex items-center justify-between px-3 py-2 flex-shrink-0" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
        <div className="flex items-center gap-2 min-w-0">
          <div className="text-white font-medium truncate text-sm">{file.name}</div>
          {siblings.length > 1 && (
            <div className="text-xs text-white/60 whitespace-nowrap">{idx + 1} / {siblings.length}</div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <IconBtn onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))} title="Zoom out (-)"><ZoomOut size={16} /></IconBtn>
          <span className="text-xs text-white/70 min-w-[3rem] text-center">{Math.round(zoom * 100)}%</span>
          <IconBtn onClick={() => setZoom((z) => Math.min(5, z + 0.25))} title="Zoom in (+)"><ZoomIn size={16} /></IconBtn>
          <IconBtn onClick={() => setRotation((r) => r + 90)} title="Rotate (R)"><RotateCw size={16} /></IconBtn>
          <IconBtn onClick={() => setSlideshow((s) => !s)} title="Slideshow">{slideshow ? <Pause size={16} /> : <Play size={16} />}</IconBtn>
          <IconBtn onClick={toggleFullscreen} title="Fullscreen">{fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}</IconBtn>
          <IconBtn onClick={() => setShowInfo((s) => !s)} title="Info"><Info size={16} /></IconBtn>
          <IconBtn onClick={onClose} title="Close"><X size={16} /></IconBtn>
        </div>
      </div>

      <div
        className="flex-1 relative overflow-hidden flex items-center justify-center"
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        style={{ cursor: zoom > 1 ? (dragging ? 'grabbing' : 'grab') : 'default' }}
      >
        {canPrev && (
          <button onClick={() => onNavigate?.(siblings[idx - 1])} className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full hover:bg-white/10" style={{ background: 'rgba(0,0,0,0.4)' }}>
            <ChevronLeft size={24} color="white" />
          </button>
        )}
        {canNext && (
          <button onClick={() => onNavigate?.(siblings[idx + 1])} className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full hover:bg-white/10" style={{ background: 'rgba(0,0,0,0.4)' }}>
            <ChevronRight size={24} color="white" />
          </button>
        )}

        <img
          src={url}
          alt={file.name}
          draggable={false}
          style={{
            transform: `translate(${pos.x}px, ${pos.y}px) scale(${zoom}) rotate(${rotation}deg)`,
            transition: dragging ? 'none' : 'transform 0.2s',
            maxWidth: '100%',
            maxHeight: '100%',
            userSelect: 'none',
          }}
        />

        {showInfo && (
          <div className="absolute left-4 top-4 w-64 p-4 rounded-xl text-sm text-white" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)' }}>
            <div className="font-semibold mb-2">File Info</div>
            <div className="space-y-1 text-xs text-white/80">
              <div><span className="text-white/50">Name:</span> {file.name}</div>
              <div><span className="text-white/50">Type:</span> {file.content_type}</div>
              <div><span className="text-white/50">Size:</span> {(file.size / 1024).toFixed(1)} KB</div>
              <div><span className="text-white/50">Uploaded:</span> {new Date(file.created_at).toLocaleString()}</div>
              {file.tags?.length > 0 && <div><span className="text-white/50">Tags:</span> {file.tags.join(', ')}</div>}
            </div>
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
