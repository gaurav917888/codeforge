'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  Archive, Code2, Download, ExternalLink, FileUp, FolderOpen,
  Image as ImageIcon, Minimize2, Play, RotateCcw, Save,
  Search, WandSparkles, X, Plus, Trash2, Edit3, CheckCircle,
} from 'lucide-react';
import beautify from 'js-beautify';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import AppShell from '@/components/layout/AppShell';
import { useAuth } from '@/components/auth/AuthGate';
import { supabase } from '@/lib/supabase';

/* ── Defaults ────────────────────────────────────────────── */
const DEFAULT_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CodeForge</title>
</head>
<body>
  <h1>Hello, CodeForge! ✨</h1>
  <p>Start coding to see the magic.</p>
</body>
</html>`;
const DEFAULT_CSS = `body {
  font-family: system-ui, sans-serif;
  padding: 2rem;
  background: #f8f9fa;
  margin: 0;
}
h1 { color: #6c5ce7; }`;
const DEFAULT_JS = `console.log('CodeForge ready! 🚀');`;

const SNIPPETS = [
  { label: '{ }',          code: '{  }' },
  { label: '( )',          code: '(  )' },
  { label: '[ ]',          code: '[  ]' },
  { label: '<div>',        code: '<div></div>' },
  { label: 'log',          code: 'console.log()' },
  { label: 'fn',           code: 'function name() {\n  \n}' },
  { label: 'const',        code: 'const  = ' },
  { label: '=>',           code: '() => ' },
  { label: 'if',           code: 'if () {\n  \n}' },
  { label: 'for',          code: 'for (let i = 0; i < ; i++) {\n  \n}' },
  { label: 'class',        code: 'class Name {\n  constructor() {\n    \n  }\n}' },
  { label: 'async',        code: 'async function name() {\n  \n}' },
];

const DEVICES = [
  { label: 'Full',   width: '100%'   },
  { label: 'Mobile', width: '375px'  },
  { label: 'Tablet', width: '768px'  },
  { label: 'Laptop', width: '1024px' },
];

/* script injected into the preview iframe: forwards console.* calls to the parent so
   the CodeForge "Console" tab can act as a lightweight terminal for the running page */
const CONSOLE_BRIDGE = `<script>
  (function(){
    var send = function(level, args){
      try {
        var parts = Array.prototype.map.call(args, function(a){
          if (a instanceof Error) return a.message;
          if (typeof a === 'object') { try { return JSON.stringify(a); } catch(e){ return String(a); } }
          return String(a);
        });
        window.parent.postMessage({ __cf_console: true, level: level, text: parts.join(' ') }, '*');
      } catch(e) {}
    };
    ['log','warn','error','info'].forEach(function(level){
      var orig = console[level];
      console[level] = function(){ send(level, arguments); orig.apply(console, arguments); };
    });
    window.addEventListener('error', function(e){ send('error', [e.message]); });
  })();
<\/script>`;

/* ── Helpers ─────────────────────────────────────────────── */
function loadSaved() {
  try { return JSON.parse(localStorage.getItem('cf_save') || '{}'); } catch { return {}; }
}

function minify(type, value) {
  if (type === 'html') return value.replace(/<!--[\s\S]*?-->/g, '').replace(/>\s+</g, '><').trim();
  if (type === 'css')  return value.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').replace(/\s*([{}:;,])\s*/g, '$1').trim();
  return value.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s+/gm, '').replace(/\n+/g, '\n').trim();
}

function extractMedia(html) {
  if (typeof DOMParser === 'undefined') return [];
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const out = [];
  doc.querySelectorAll('img').forEach((el) => { if (el.src) out.push({ type: 'image', src: el.src }); });
  doc.querySelectorAll('video').forEach((el) => {
    if (el.src) out.push({ type: 'video', src: el.src });
    el.querySelectorAll('source').forEach((s) => { if (s.src) out.push({ type: 'video', src: s.src }); });
  });
  return out;
}

/* ── VaultX Media Library Picker ─────────────────────────── */
function MediaLibraryPicker({ userId, onInsert, onClose }) {
  const [items, setItems] = useState([]);
  const [urls, setUrls] = useState({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    supabase
      .from('files')
      .select('*')
      .eq('user_id', userId)
      .or('content_type.like.image/%,content_type.like.video/%')
      .order('created_at', { ascending: false })
      .limit(60)
      .then(async ({ data }) => {
        const rows = data || [];
        setItems(rows);
        if (rows.length) {
          const { data: signed } = await supabase.storage.from('vaultx').createSignedUrls(rows.map((r) => r.storage_path), 3600);
          const map = {};
          (signed || []).forEach((s, i) => { if (s?.signedUrl) map[rows[i].id] = s.signedUrl; });
          setUrls(map);
        }
        setLoading(false);
      });
  }, [userId]);

  const filtered = items.filter((f) => f.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="cf-overlay" onClick={onClose}>
      <div className="cf-modal" style={{ maxWidth: 560, width: '100%' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <strong className="font-heading text-xl">VaultX Media Library</strong>
          <button onClick={onClose} style={{ color: 'var(--cf-muted)' }}><X size={18} /></button>
        </div>
        <input
          className="cf-input mb-3"
          style={{ width: '100%' }}
          placeholder="Search your media…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {loading ? (
          <div className="flex justify-center py-10"><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <p className="text-center py-10 text-sm" style={{ color: 'var(--cf-muted)' }}>
            No media found. Upload images or videos in VaultX first.
          </p>
        ) : (
          <div className="cf-media-grid" style={{ maxHeight: '50vh', overflowY: 'auto' }}>
            {filtered.map((f) => (
              <button
                key={f.id}
                className="cf-media-item"
                title={f.name}
                onClick={() => { if (urls[f.id]) onInsert(f, urls[f.id]); }}
              >
                {f.content_type?.startsWith('image/') ? (
                  <img src={urls[f.id]} alt={f.name} loading="lazy" />
                ) : (
                  <Play size={20} style={{ color: 'var(--cf-muted)' }} />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Recent Projects Panel ───────────────────────────────── */
function ProjectsPanel({ userId, onLoad, onClose }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [renaming, setRenaming] = useState(null);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    if (!userId) return;
    supabase.from('projects').select('*').eq('user_id', userId).order('updated_at', { ascending: false }).limit(5)
      .then(({ data }) => { setProjects(data || []); setLoading(false); });
  }, [userId]);

  const doDelete = async (id) => {
    if (!confirm('Delete this project?')) return;
    await supabase.from('projects').delete().eq('id', id);
    setProjects((p) => p.filter((x) => x.id !== id));
  };

  const doRename = async (id) => {
    if (!newName.trim()) return;
    await supabase.from('projects').update({ name: newName }).eq('id', id);
    setProjects((p) => p.map((x) => x.id === id ? { ...x, name: newName } : x));
    setRenaming(null); setNewName('');
  };

  return (
    <div className="cf-overlay" onClick={onClose}>
      <div className="cf-modal" style={{ maxWidth: 480, width: '100%' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <strong className="font-heading text-xl">Recent Projects</strong>
          <button onClick={onClose} style={{ color: 'var(--cf-muted)' }}><X size={18} /></button>
        </div>
        {loading ? (
          <div className="flex justify-center py-8"><div className="spinner" /></div>
        ) : projects.length === 0 ? (
          <p className="text-center py-8 text-sm" style={{ color: 'var(--cf-muted)' }}>No saved projects yet. Save your current work!</p>
        ) : (
          <div className="flex flex-col gap-2">
            {projects.map((p) => (
              <div key={p.id} className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'var(--cf-bg)', border: '1px solid var(--cf-border)' }}>
                {renaming === p.id ? (
                  <input
                    autoFocus
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') doRename(p.id); if (e.key === 'Escape') setRenaming(null); }}
                    className="cf-input flex-1"
                    style={{ width: 'auto' }}
                  />
                ) : (
                  <button className="flex-1 text-left text-sm font-medium truncate" onClick={() => { onLoad(p); onClose(); }}>
                    {p.name}
                  </button>
                )}
                <span className="text-xs flex-shrink-0" style={{ color: 'var(--cf-muted)' }}>
                  {new Date(p.updated_at).toLocaleDateString()}
                </span>
                {renaming === p.id ? (
                  <button className="cf-btn px-2" onClick={() => doRename(p.id)}><CheckCircle size={13} /></button>
                ) : (
                  <button className="cf-btn px-2" onClick={() => { setRenaming(p.id); setNewName(p.name); }} title="Rename">
                    <Edit3 size={13} />
                  </button>
                )}
                <button className="cf-btn px-2" onClick={() => doDelete(p.id)} title="Delete" style={{ color: '#ef4444' }}>
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main CodeForge App ──────────────────────────────────── */
export default function CodeForgeApp() {
  const { user } = useAuth();
  const userId = user?.id;

  const [html, setHtml] = useState(DEFAULT_HTML);
  const [css,  setCss]  = useState(DEFAULT_CSS);
  const [js,   setJs]   = useState(DEFAULT_JS);
  const [activeTab,    setActiveTab]    = useState('html');
  const [fontSize,     setFontSize]     = useState(13);
  const [deviceWidth,  setDeviceWidth]  = useState('100%');
  const [editorWidth,  setEditorWidth]  = useState(50);
  const [toast,        setToast]        = useState('');
  const [saveStatus,   setSaveStatus]   = useState('idle'); // 'idle'|'saving'|'saved'
  const [query,        setQuery]        = useState('');
  const [replaceVal,   setReplaceVal]   = useState('');
  const [showReplace,  setShowReplace]  = useState(false);
  const [searchIndex,  setSearchIndex]  = useState(0);
  const [beautifyBack, setBeautifyBack] = useState({});
  const [fetchState,   setFetchState]   = useState({ active: false, status: '', url: '' });
  const [mobileMenu,   setMobileMenu]   = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [mediaLibraryOpen, setMediaLibraryOpen] = useState(false);
  const [projectName,  setProjectName]  = useState('Untitled Project');
  const [editingName,  setEditingName]  = useState(false);
  const [projectId,    setProjectId]    = useState(null);
  const [showMinimap,  setShowMinimap]  = useState(false);

  const editorRef   = useRef(null);
  const lineNumbersRef = useRef(null);
  const fileRef     = useRef(null);
  const mediaRef    = useRef(null);
  const abortRef    = useRef(null);
  const toastTimer  = useRef(null);
  const saveTimer   = useRef(null);

  /* ── Load from localStorage ──────────────────────────── */
  useEffect(() => {
    const s = loadSaved();
    setHtml(s.html || DEFAULT_HTML);
    setCss(s.css   || DEFAULT_CSS);
    setJs(s.js     || DEFAULT_JS);
    const w = parseFloat(localStorage.getItem('cf_layout_width') || '50');
    if (w >= 15 && w <= 85) setEditorWidth(w);
    const fs = parseInt(localStorage.getItem('cf_font_size') || '13', 10);
    if (fs >= 10 && fs <= 22) setFontSize(fs);
    if (s.projectName) setProjectName(s.projectName);
    if (s.projectId)   setProjectId(s.projectId);
  }, []);

  /* ── Auto-save to localStorage ───────────────────────── */
  useEffect(() => {
    setSaveStatus('saving');
    const t = setTimeout(() => {
      localStorage.setItem('cf_save', JSON.stringify({ html, css, js, projectName, projectId }));
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 1800);
    }, 600);
    return () => clearTimeout(t);
  }, [html, css, js, projectName, projectId]);

  /* ── Font size persistence ───────────────────────────── */
  useEffect(() => {
    localStorage.setItem('cf_font_size', String(fontSize));
  }, [fontSize]);

  /* ── Console output capture (acts as a lightweight terminal) ── */
  const [consoleLogs, setConsoleLogs] = useState([]);

  /* ── Computed ────────────────────────────────────────── */
  const previewDoc = useMemo(() => `${CONSOLE_BRIDGE}<style>${css}</style>${html}<script>${js}<\/script>`, [html, css, js]);
  const media = useMemo(() => extractMedia(html), [html]);

  useEffect(() => {
    const onMsg = (e) => {
      if (e.data?.__cf_console) {
        setConsoleLogs((p) => [...p.slice(-199), { level: e.data.level, text: e.data.text, time: new Date().toLocaleTimeString() }]);
      }
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  /* clear console on every preview reload */
  useEffect(() => { setConsoleLogs([]); }, [previewDoc]);

  const activeValue = activeTab === 'html' ? html : activeTab === 'css' ? css : js;
  const setActiveValue = useCallback((v) => {
    if (activeTab === 'html') setHtml(v);
    else if (activeTab === 'css') setCss(v);
    else setJs(v);
  }, [activeTab]);

  const matches = useMemo(() => {
    if (!query || activeTab === 'media' || activeTab === 'console') return [];
    const lower = activeValue.toLowerCase();
    const q = query.toLowerCase();
    const out = [];
    let idx = lower.indexOf(q);
    while (idx !== -1) { out.push(idx); idx = lower.indexOf(q, idx + q.length); }
    return out;
  }, [activeValue, activeTab, query]);

  /* ── Notify toast ────────────────────────────────────── */
  const notify = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2400);
  }, []);

  /* ── Format / Minify ─────────────────────────────────── */
  const formatCode = () => {
    if (activeTab === 'media' || activeTab === 'console') return;
    if (beautifyBack[activeTab]) {
      setActiveValue(beautifyBack[activeTab]);
      setBeautifyBack((p) => ({ ...p, [activeTab]: '' }));
      notify('Restored original');
      return;
    }
    const opts = { indent_size: 2 };
    const out = activeTab === 'html' ? beautify.html(activeValue, opts)
      : activeTab === 'css' ? beautify.css(activeValue, opts)
      : beautify.js(activeValue, opts);
    setBeautifyBack((p) => ({ ...p, [activeTab]: activeValue }));
    setActiveValue(out);
    notify('Formatted ✨');
  };

  const minifyCode = () => {
    if (activeTab === 'media' || activeTab === 'console') return;
    setActiveValue(minify(activeTab, activeValue));
    notify('Minified 🗜️');
  };

  /* ── Snippet insert ──────────────────────────────────── */
  const insertSnippet = (code) => {
    if (activeTab === 'media' || activeTab === 'console') return;
    const el = editorRef.current;
    const start = el?.selectionStart ?? activeValue.length;
    const end   = el?.selectionEnd   ?? activeValue.length;
    setActiveValue(activeValue.slice(0, start) + code + activeValue.slice(end));
    setTimeout(() => { el?.focus(); el?.setSelectionRange(start + code.length, start + code.length); }, 0);
  };

  /* ── Search navigation ───────────────────────────────── */
  const navigateSearch = (reverse = false) => {
    if (!matches.length || !editorRef.current) return;
    const next = reverse
      ? (searchIndex <= 1 ? matches.length : searchIndex - 1)
      : (searchIndex >= matches.length ? 1 : searchIndex + 1);
    setSearchIndex(next);
    const pos = matches[next - 1];
    editorRef.current.focus();
    editorRef.current.setSelectionRange(pos, pos + query.length);
  };

  /* ── Find & Replace ──────────────────────────────────── */
  const replaceNext = () => {
    if (!query || !replaceVal || !matches.length) return;
    const pos = matches[(searchIndex || 1) - 1];
    const before = activeValue.slice(0, pos);
    const after  = activeValue.slice(pos + query.length);
    setActiveValue(before + replaceVal + after);
    notify(`Replaced instance`);
  };

  const replaceAll = () => {
    if (!query) return;
    const count = matches.length;
    setActiveValue(activeValue.split(query).join(replaceVal));
    notify(`Replaced ${count} occurrence${count !== 1 ? 's' : ''}`);
  };

  /* ── File import (shared by file-picker + drag & drop) ──── */
  const handleFileImport = useCallback((file) => {
    if (!file) return;
    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      const reader = new FileReader();
      reader.onload = () => {
        const tag = file.type.startsWith('video/')
          ? `<video src="${reader.result}" controls></video>`
          : `<img src="${reader.result}" alt="${file.name}">`;
        setHtml((p) => `${p}\n${tag}`);
        setActiveTab('html');
        notify('Media inserted');
      };
      reader.readAsDataURL(file);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const ext = file.name.split('.').pop().toLowerCase();
      const val = String(reader.result || '');
      if (ext === 'css') { setCss(val); setActiveTab('css'); }
      else if (ext === 'js') { setJs(val); setActiveTab('js'); }
      else { setHtml(val); setActiveTab('html'); }
      notify(`Imported ${file.name}`);
    };
    reader.readAsText(file);
  }, [notify]);

  const importFile = (e) => { handleFileImport(e.target.files?.[0]); e.target.value = ''; };
  const importMedia = (e) => { handleFileImport(e.target.files?.[0]); e.target.value = ''; };

  const insertLibraryMedia = (file, url) => {
    const tag = file.content_type?.startsWith('video/')
      ? `<video src="${url}" controls></video>`
      : `<img src="${url}" alt="${file.name}">`;
    setHtml((p) => `${p}\n${tag}`);
    setActiveTab('html');
    setMediaLibraryOpen(false);
    notify(`Inserted ${file.name} from VaultX`);
  };

  /* ── Drag & drop onto editor panel ───────────────────── */
  const [dragOver, setDragOver] = useState(false);
  const onEditorDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileImport(file);
  };

  /* ── Export ──────────────────────────────────────────── */
  const exportHTML = () => {
    saveAs(new Blob([`<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${css}</style></head><body>${html}<script>${js}<\/script></body></html>`], { type: 'text/html' }), 'index.html');
    notify('Exported as index.html');
  };

  const exportZip = async () => {
    const zip = new JSZip();
    zip.file('index.html', html);
    zip.file('style.css', css);
    zip.file('script.js', js);
    saveAs(await zip.generateAsync({ type: 'blob' }), `${projectName}.zip`);
    notify('ZIP exported 📦');
  };

  /* ── Save/Load project to Supabase ──────────────────── */
  const saveProject = async () => {
    if (!userId) return notify('Sign in to save projects');
    setSaveStatus('saving');
    const payload = { user_id: userId, name: projectName, html, css, js, updated_at: new Date().toISOString() };
    let res;
    if (projectId) {
      res = await supabase.from('projects').update(payload).eq('id', projectId).select().single();
    } else {
      res = await supabase.from('projects').insert(payload).select().single();
      /* keep only 5 per user */
      supabase.from('projects').select('id').eq('user_id', userId).order('updated_at', { ascending: true })
        .then(({ data }) => {
          if (data && data.length > 5) {
            const toDelete = data.slice(0, data.length - 5).map((r) => r.id);
            supabase.from('projects').delete().in('id', toDelete);
          }
        });
    }
    if (res.data) {
      setProjectId(res.data.id);
      localStorage.setItem('cf_save', JSON.stringify({ html, css, js, projectName, projectId: res.data.id }));
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 1800);
      notify('Project saved ✓');
    }
  };

  const loadProject = (proj) => {
    setHtml(proj.html || '');
    setCss(proj.css || '');
    setJs(proj.js || '');
    setProjectName(proj.name);
    setProjectId(proj.id);
    setActiveTab('html');
    notify(`Loaded: ${proj.name}`);
  };

  /* ── Reset ───────────────────────────────────────────── */
  const resetAll = () => {
    if (!confirm('Clear all code?')) return;
    localStorage.removeItem('cf_save');
    setHtml(''); setCss(''); setJs('');
    setProjectName('Untitled Project'); setProjectId(null);
    notify('Editor cleared');
  };

  /* ── Fetch URL ───────────────────────────────────────── */
  const fetchUrl = async () => {
    const input = document.getElementById('cf-url-input');
    let url = input?.value?.trim();
    if (!url) return notify('Enter a URL');
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setFetchState({ active: true, status: 'Fetching…', url });
    try {
      const res = await fetch('/api/codeforge/fetch-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
        signal: ctrl.signal,
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed');
      setHtml(beautify.html(payload.html, { indent_size: 2 }));
      setActiveTab('html');
      notify('Website fetched! 🌐');
    } catch (err) {
      if (err.name !== 'AbortError') notify(`Error: ${err.message}`);
    } finally {
      setFetchState({ active: false, status: '', url: '' });
    }
  };

  /* ── Open preview in new tab ─────────────────────────── */
  const openPreview = () => {
    const blob = new Blob([`<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${css}</style></head><body>${html}<script>${js}<\/script></body></html>`], { type: 'text/html' });
    window.open(URL.createObjectURL(blob), '_blank');
  };

  /* ── Drag resize ─────────────────────────────────────── */
  const startDrag = (e) => {
    e.preventDefault();
    const move = (ev) => {
      const x = ev.touches?.[0]?.clientX ?? ev.clientX;
      const pct = Math.min(85, Math.max(15, (x / window.innerWidth) * 100));
      setEditorWidth(pct);
      localStorage.setItem('cf_layout_width', String(pct));
    };
    const stop = () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('touchmove', move);
      document.removeEventListener('mouseup', stop);
      document.removeEventListener('touchend', stop);
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('touchmove', move);
    document.addEventListener('mouseup', stop);
    document.addEventListener('touchend', stop);
  };

  /* ── Keyboard shortcuts ──────────────────────────────── */
  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 's') { e.preventDefault(); saveProject(); }
        if (e.key === 'f') { e.preventDefault(); document.querySelector('.cf-search-input')?.focus(); }
        if (e.key === 'h') { e.preventDefault(); setShowReplace((p) => !p); }
        if (e.key === 'm' && e.shiftKey) { e.preventDefault(); setShowMinimap((p) => !p); }
        if (e.key === 'p' && e.shiftKey) { e.preventDefault(); formatCode(); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [saveProject, formatCode]);

  /* ── Action buttons (shared desktop + mobile) ────────── */
  const actionButtons = (
    <>
      <button className="cf-btn" onClick={formatCode}><WandSparkles size={14} />Format</button>
      <button className="cf-btn" onClick={minifyCode}><Minimize2 size={14} />Minify</button>
      <button className="cf-btn" onClick={() => { setFontSize((s) => Math.min(22, s + 2)); }}><span style={{ fontSize: 14, fontWeight: 900 }}>A+</span></button>
      <button className="cf-btn" onClick={() => { setFontSize((s) => Math.max(10, s - 2)); }}><span style={{ fontSize: 14, fontWeight: 900 }}>A-</span></button>
      <button className="cf-btn" onClick={() => fileRef.current?.click()}><FileUp size={14} />Import</button>
      <button className="cf-btn" onClick={exportHTML}><Download size={14} />HTML</button>
      <button className="cf-btn" onClick={exportZip}><Archive size={14} />ZIP</button>
      <button className="cf-btn" onClick={resetAll}><RotateCcw size={14} />Reset</button>
    </>
  );

  const saveStatusEl = saveStatus === 'saving'
    ? <span className="text-xs" style={{ color: 'var(--cf-muted)' }}>Saving…</span>
    : saveStatus === 'saved'
    ? <span className="text-xs" style={{ color: '#10b981' }}>✓ Saved</span>
    : null;

  return (
    <AppShell title="CodeForge">
      <section
        className="codeforge-shell"
        style={{
          '--cf-editor-width': `${editorWidth}%`,
          '--cf-font-size': `${fontSize}px`,
          '--cf-device-width': deviceWidth,
        }}
      >
        {/* ── Toolbar ──────────────────────────────────── */}
        <div className="codeforge-toolbar">
          <Code2 size={18} style={{ color: 'var(--cf-accent)', flexShrink: 0 }} />

          {/* Project name */}
          {editingName ? (
            <input
              autoFocus
              className="cf-input"
              style={{ width: 160, fontWeight: 700 }}
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              onBlur={() => setEditingName(false)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') setEditingName(false); }}
            />
          ) : (
            <button
              className="text-sm font-bold truncate max-w-[120px] sm:max-w-[200px]"
              style={{ color: 'var(--cf-text)' }}
              onClick={() => setEditingName(true)}
              title="Click to rename project"
            >
              {projectName}
            </button>
          )}
          {saveStatusEl}

          <div className="hide-mobile flex gap-1 items-center">{actionButtons}</div>

          <div className="ml-auto flex items-center gap-1">
            {/* Search */}
            <div className="flex items-center gap-1">
              <Search size={14} style={{ color: 'var(--cf-muted)' }} />
              <input
                className="cf-input cf-search-input"
                style={{ width: 110 }}
                placeholder="Find…"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setSearchIndex(e.target.value ? 1 : 0); }}
                onKeyDown={(e) => { if (e.key === 'Enter') navigateSearch(e.shiftKey); }}
              />
              <span className="text-xs hidden sm:inline" style={{ color: 'var(--cf-muted)', minWidth: 28 }}>
                {matches.length ? `${searchIndex || 1}/${matches.length}` : '0/0'}
              </span>
              <button
                className="cf-btn px-2"
                onClick={() => setShowReplace((p) => !p)}
                title="Toggle replace (Ctrl+H)"
                style={showReplace ? { borderColor: 'var(--cf-accent)', color: 'var(--cf-accent)' } : {}}
              >
                <Edit3 size={13} />
              </button>
            </div>

            {/* URL Fetch */}
            <input id="cf-url-input" className="cf-input hide-mobile" style={{ width: 120 }} placeholder="example.com" onKeyDown={(e) => { if (e.key === 'Enter') fetchUrl(); }} />
            <button className="cf-btn hide-mobile" onClick={fetchUrl}>Fetch</button>

            {/* Projects + Save */}
            <button className="cf-btn hide-mobile" onClick={() => setProjectsOpen(true)} title="Recent projects"><FolderOpen size={14} />Projects</button>
            <button className="cf-btn hide-mobile" onClick={saveProject} title="Save project (Ctrl+S)"><Save size={14} />Save</button>
          </div>
        </div>

        {/* ── Replace bar ──────────────────────────────── */}
        {showReplace && (
          <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: 'var(--cf-border)', background: 'var(--cf-surface)' }}>
            <span className="text-xs font-semibold" style={{ color: 'var(--cf-muted)' }}>Replace</span>
            <input
              className="cf-input"
              style={{ width: 140 }}
              placeholder="Replace with…"
              value={replaceVal}
              onChange={(e) => setReplaceVal(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') replaceNext(); }}
            />
            <button className="cf-btn" onClick={replaceNext}>Next</button>
            <button className="cf-btn" onClick={replaceAll}>All</button>
            <button className="cf-btn px-2" onClick={() => setShowReplace(false)}><X size={13} /></button>
          </div>
        )}

        <input ref={fileRef}  type="file" accept=".html,.css,.js,.txt" hidden onChange={importFile} />
        <input ref={mediaRef} type="file" accept="image/*,video/*"     hidden onChange={importMedia} />

        {/* ── Main ─────────────────────────────────────── */}
        <div className="codeforge-main">
          {/* Editor panel */}
          <div
            className="cf-editor-panel"
            style={{ position: 'relative' }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onEditorDrop}
          >
            {dragOver && (
              <div className="cf-drop-overlay">
                <FileUp size={28} />
                <p>Drop file to import — code, image, or video</p>
              </div>
            )}
            <div className="cf-tabs">
              {['html', 'css', 'js', 'media', 'console'].map((t) => (
                <button key={t} className={`cf-tab ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>
                  {t === 'console' ? `Console${consoleLogs.length ? ` (${consoleLogs.length})` : ''}` : t.toUpperCase()}
                </button>
              ))}
            </div>

            {activeTab === 'console' ? (
              <div className="cf-console-panel">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold" style={{ color: 'var(--cf-muted)' }}>Live output from your preview&apos;s console.*</span>
                  <button className="cf-btn" style={{ minHeight: 28, fontSize: 11 }} onClick={() => setConsoleLogs([])}>Clear</button>
                </div>
                <div className="cf-console-log">
                  {consoleLogs.length === 0 ? (
                    <p style={{ color: '#6b7280' }}>No output yet — use console.log() in your JS to see it here.</p>
                  ) : consoleLogs.map((l, i) => (
                    <div key={i} className={`cf-console-line cf-console-lvl-${l.level}`}>
                      <span className="cf-console-time">{l.time}</span> {l.text}
                    </div>
                  ))}
                </div>
              </div>
            ) : activeTab === 'media' ? (
              <div className="cf-media-panel">
                <div className="flex gap-2 mb-3">
                  <button className="cf-btn flex-1" onClick={() => mediaRef.current?.click()}>
                    <ImageIcon size={15} /> Upload & Embed
                  </button>
                  <button className="cf-btn flex-1" onClick={() => setMediaLibraryOpen(true)}>
                    <FolderOpen size={15} /> VaultX Library
                  </button>
                </div>
                <div className="cf-media-grid">
                  {media.map((item, i) => (
                    <button key={`${item.src}-${i}`} className="cf-media-item" onClick={() => window.open(item.src, '_blank')}>
                      {item.type === 'image'
                        ? <img src={item.src} alt="Media" loading="lazy" />
                        : <Play size={24} style={{ color: 'var(--cf-muted)' }} />}
                    </button>
                  ))}
                  {media.length === 0 && (
                    <p className="col-span-full text-xs text-center py-8" style={{ color: 'var(--cf-muted)' }}>
                      No media in HTML yet. Add &lt;img&gt; or &lt;video&gt; tags.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="cf-editor-wrap" style={{ position: 'relative' }}>
                {/* Line numbers */}
                <div ref={lineNumbersRef} className="cf-line-numbers" aria-hidden="true">
                  {activeValue.split('\n').map((_, i) => (
                    <span key={i}>{i + 1}</span>
                  ))}
                </div>
                <textarea
                  ref={editorRef}
                  className="cf-textarea"
                  value={activeValue}
                  onChange={(e) => setActiveValue(e.target.value)}
                  onScroll={(e) => { if (lineNumbersRef.current) lineNumbersRef.current.scrollTop = e.target.scrollTop; }}
                  spellCheck={false}
                  onKeyDown={(e) => {
                    /* Tab key inserts spaces */
                    if (e.key === 'Tab') {
                      e.preventDefault();
                      const start = e.target.selectionStart;
                      const end   = e.target.selectionEnd;
                      const newVal = activeValue.slice(0, start) + '  ' + activeValue.slice(end);
                      setActiveValue(newVal);
                      setTimeout(() => editorRef.current?.setSelectionRange(start + 2, start + 2), 0);
                    }
                  }}
                />
                {/* Minimap */}
                {showMinimap && (
                  <div className="cf-minimap" aria-hidden="true">
                    <pre style={{ fontSize: 2, lineHeight: 1.4, color: '#aaa', pointerEvents: 'none' }}>
                      {activeValue}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* Snippets bar */}
            <div className="hidden gap-1 overflow-x-auto border-t p-1.5 sm:flex flex-wrap" style={{ borderColor: 'var(--cf-border)', background: 'var(--cf-bg)' }}>
              {SNIPPETS.map((s) => (
                <button key={s.label} className="cf-btn" style={{ fontSize: 11, minHeight: 28, padding: '0 8px' }} onClick={() => insertSnippet(s.code)}>
                  {s.label}
                </button>
              ))}
              <button
                className="cf-btn ml-auto"
                onClick={() => setShowMinimap((p) => !p)}
                title="Toggle minimap (Ctrl+Shift+M)"
                style={{ fontSize: 11, minHeight: 28, padding: '0 8px', borderColor: showMinimap ? 'var(--cf-accent)' : undefined }}
              >
                Map
              </button>
            </div>
          </div>

          <div className="cf-dragbar" onMouseDown={startDrag} onTouchStart={startDrag} />

          {/* Preview panel */}
          <div className="cf-preview-panel">
            <div className="cf-devicebar">
              {DEVICES.map((d) => (
                <button key={d.width} className={`cf-device ${deviceWidth === d.width ? 'active' : ''}`} onClick={() => setDeviceWidth(d.width)}>
                  {d.label}
                </button>
              ))}
              <button className="cf-device ml-auto" onClick={openPreview}><ExternalLink size={13} />Open</button>
            </div>
            <iframe
              className="cf-preview-frame"
              title="Live Preview"
              srcDoc={previewDoc}
              sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups allow-presentation allow-downloads"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>

        {/* ── Mobile bottom bar ─────────────────────────── */}
        <div className="cf-mobile-bar">
          <button className="cf-btn" onClick={formatCode}><WandSparkles size={16} /></button>
          <button className="cf-btn" onClick={() => mediaRef.current?.click()}><ImageIcon size={16} /></button>
          <button className="cf-btn" onClick={() => setProjectsOpen(true)}><FolderOpen size={16} /></button>
          <button className="cf-btn" onClick={saveProject}><Save size={16} /></button>
          <button className="cf-btn" onClick={() => setMobileMenu(true)}>More</button>
        </div>

        {/* ── Toast ────────────────────────────────────── */}
        {toast && <div className="cf-toast">{toast}</div>}

        {/* ── Fetch overlay ────────────────────────────── */}
        {fetchState.active && (
          <div className="cf-overlay">
            <div className="cf-modal text-center">
              <div className="spinner mx-auto mb-4" />
              <h2 className="font-heading text-xl">{fetchState.status}</h2>
              <p className="my-3 text-sm" style={{ color: 'var(--cf-muted)' }}>{fetchState.url}</p>
              <button className="cf-btn mx-auto" onClick={() => abortRef.current?.abort()}>Cancel</button>
            </div>
          </div>
        )}

        {/* ── Mobile all-actions modal ──────────────────── */}
        {mobileMenu && (
          <div className="cf-overlay" onClick={() => setMobileMenu(false)}>
            <div className="cf-modal" onClick={(e) => e.stopPropagation()}>
              <h2 className="font-heading text-xl mb-3">All Actions</h2>
              <div className="cf-action-grid">
                {actionButtons}
                <button className="cf-btn" onClick={saveProject}><Save size={14} />Save</button>
                <button className="cf-btn" onClick={() => { setMobileMenu(false); setProjectsOpen(true); }}><FolderOpen size={14} />Projects</button>
                <button className="cf-btn" onClick={() => setMobileMenu(false)}><X size={14} />Close</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Recent projects panel ────────────────────── */}
        {projectsOpen && (
          <ProjectsPanel userId={userId} onLoad={loadProject} onClose={() => setProjectsOpen(false)} />
        )}

        {/* ── VaultX media library picker ──────────────── */}
        {mediaLibraryOpen && (
          <MediaLibraryPicker userId={userId} onInsert={insertLibraryMedia} onClose={() => setMediaLibraryOpen(false)} />
        )}
      </section>
    </AppShell>
  );
}
