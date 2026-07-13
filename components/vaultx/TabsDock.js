'use client';
import { X, ExternalLink, Download, Share2, Trash2, Star } from 'lucide-react';
import { useEffect } from 'react';
import ImageViewer from './ImageViewer';
import VideoPlayer from './VideoPlayer';

// Bottom-docked multi-tab file viewer (Claude-style)
export default function TabsDock({
  tabs, activeTabId, siblings,
  onSetActive, onCloseTab,
  onShare, onDownload, onFavorite, onDelete,
  onNavigateInImage, onNavigateInVideo,
}) {
  const active = tabs.find((t) => t.id === activeTabId) || null;

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && active) onSetActive(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, onSetActive]);

  if (tabs.length === 0) return null;

  return (
    <>
      {/* Full-screen overlay when a tab is active */}
      {active && (
        <div
          className="fixed inset-0 z-40 flex items-end sm:items-center justify-center sm:p-6"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
          onClick={() => onSetActive(null)}
        >
          <div
            className="w-full h-[calc(100vh-72px)] sm:h-[85vh] sm:max-w-6xl bg-black rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl fade-in relative"
            onClick={(e) => e.stopPropagation()}
          >
            <ActiveViewer
              tab={active}
              siblings={siblings}
              onClose={() => onSetActive(null)}
              onNavigateInImage={onNavigateInImage}
              onNavigateInVideo={onNavigateInVideo}
            />

            {/* Floating action pill — top-right, below viewer header */}
            <FloatingActions
              file={active.file}
              onFavorite={() => onFavorite?.(active)}
              onDownload={() => onDownload?.(active)}
              onShare={() => onShare?.(active)}
              onDelete={async () => {
                const done = await onDelete?.(active);
                if (done !== false) onSetActive(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Docked tab bar */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 flex items-center gap-1 overflow-x-auto px-2 py-1.5 no-scrollbar"
        style={{
          background: 'color-mix(in oklab, var(--bg-surface) 92%, transparent)',
          borderTop: '1px solid var(--border-color)',
          backdropFilter: 'blur(12px)',
        }}
      >
        {tabs.map((t) => {
          const isActive = t.id === activeTabId;
          return (
            <div
              key={t.id}
              className="flex items-center gap-2 pl-3 pr-1.5 py-1.5 rounded-lg text-sm cursor-pointer transition-all flex-shrink-0"
              style={{
                background: isActive ? 'var(--accent-soft)' : 'var(--bg-main)',
                color: isActive ? 'var(--accent-red)' : 'var(--text-main)',
                border: `1px solid ${isActive ? 'var(--accent-red)' : 'var(--border-color)'}`,
                maxWidth: 220,
              }}
              onClick={() => onSetActive(isActive ? null : t.id)}
            >
              <span className="text-sm">{iconEmoji(t.file.content_type, t.file.name)}</span>
              <span className="truncate flex-1">{t.file.name}</span>
              <button
                onClick={(e) => { e.stopPropagation(); onCloseTab(t.id); }}
                className="p-0.5 rounded hover:bg-black/10"
                title="Close tab"
              >
                <X size={12} />
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}

function FloatingActions({ file, onFavorite, onDownload, onShare, onDelete }) {
  return (
    <div
      className="absolute top-14 sm:top-16 right-3 sm:right-4 z-20 flex items-center gap-1 p-1 rounded-full fade-in"
      style={{ background: 'rgba(15,15,15,0.72)', backdropFilter: 'blur(14px) saturate(160%)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <FloatBtn onClick={onFavorite} title={file.is_favorite ? 'Remove bookmark' : 'Bookmark'}>
        <Star size={16} fill={file.is_favorite ? '#facc15' : 'none'} color={file.is_favorite ? '#facc15' : 'white'} />
      </FloatBtn>
      <FloatBtn onClick={onDownload} title="Download">
        <Download size={16} color="white" />
      </FloatBtn>
      <FloatBtn onClick={onShare} title="Share">
        <Share2 size={16} color="white" />
      </FloatBtn>
      <FloatBtn onClick={onDelete} title="Delete" danger>
        <Trash2 size={16} color="#f87171" />
      </FloatBtn>
    </div>
  );
}

function FloatBtn({ children, onClick, title, danger }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-2 rounded-full transition-all hover:scale-110"
      style={{ background: 'transparent' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = danger ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.12)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      {children}
    </button>
  );
}

function ActiveViewer({ tab, siblings, onClose, onNavigateInImage, onNavigateInVideo }) {
  const { file, url } = tab;
  const ct = file.content_type || '';

  if (ct.startsWith('image/')) {
    return (
      <ImageViewer
        file={file}
        url={url}
        siblings={siblings.filter((s) => (s.content_type || '').startsWith('image/'))}
        onNavigate={onNavigateInImage}
        onClose={onClose}
      />
    );
  }
  if (ct.startsWith('video/')) {
    return (
      <VideoPlayer
        file={file}
        url={url}
        siblings={siblings.filter((s) => (s.content_type || '').startsWith('video/'))}
        onNavigate={onNavigateInVideo}
        onClose={onClose}
      />
    );
  }
  return <GenericViewer file={file} url={url} onClose={onClose} />;
}

/* Fallback viewer — reached only for audio or unrecognised types.
   HTML/text/code/PDF are routed to a new browser tab before a dock tab is ever created. */
function GenericViewer({ file, url, onClose }) {
  const ct = file.content_type || '';
  const isAudio = ct.startsWith('audio/');

  return (
    <div className="w-full h-full flex flex-col" style={{ background: '#0b0b0b' }}>
      <div className="flex items-center justify-between px-3 py-2" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
        <div className="text-white font-medium truncate text-sm">{file.name}</div>
        <div className="flex items-center gap-1">
          <a href={url} target="_blank" rel="noreferrer" className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10" title="Open in new tab">
            <ExternalLink size={16} />
          </a>
          <button onClick={onClose} className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10" title="Close"><X size={16} /></button>
        </div>
      </div>
      <div className="flex-1 overflow-auto flex items-center justify-center" style={{ background: '#111' }}>
        {isAudio ? (
          <div className="w-full max-w-lg p-8">
            <div className="text-white/70 text-sm mb-4 text-center">{file.name}</div>
            <audio src={url} controls className="w-full" autoPlay />
          </div>
        ) : (
          <div className="text-center text-white/70 p-8">
            <p className="mb-4">Preview not available for this file type.</p>
            <a href={url} target="_blank" rel="noreferrer" className="px-4 py-2 rounded-lg text-sm font-medium accent-bg text-white">
              Open in new tab
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function iconEmoji(ct = '', name = '') {
  const ext = (name.split('.').pop() || '').toLowerCase();
  if (ct.startsWith('image/')) return '🖼️';
  if (ct.startsWith('video/')) return '🎥';
  if (ct.startsWith('audio/')) return '🎵';
  if (ct.includes('pdf') || ext === 'pdf') return '📄';
  if (ct === 'text/html' || ext === 'html' || ext === 'htm') return '🌐';
  if (ct.startsWith('text/') || ['txt', 'md', 'json', 'xml', 'csv'].includes(ext)) return '📝';
  return '📎';
}
