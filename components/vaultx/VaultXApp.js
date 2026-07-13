'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { isSupabaseConfigured, supabase, getProjectRef } from '@/lib/supabase';
import { THEMES, THEME_LIST, applyTheme, pickRandomThemeId } from '@/lib/themes';
import { FolderIcon, ICON_PICKER } from '@/lib/icons';
import { getAvatar, resolveDark } from '@/lib/userProfile';
import { useAuth } from '@/components/auth/AuthGate';
import * as tus from 'tus-js-client';
import { toast } from 'sonner';
import {
  Search, Plus, Moon, Sun, ChevronDown, ChevronRight,
  LayoutGrid, List, Upload, FolderPlus, Star, FileText,
  Image as ImageIcon, Video, Music, File as FileIcon, X, Download,
  Trash2, Sparkles, Home, Menu, Palette, Check, MoreVertical,
  Share2, CheckSquare, Square, FolderInput, ArrowLeft,
  Edit3, Info, ExternalLink, ArrowUpDown, FileCode, FileType,
} from 'lucide-react';
import TabsDock from '@/components/vaultx/TabsDock';

/* -------------------- helpers -------------------- */
const fmtSize = (b) => {
  if (!b) return '0 B';
  const k = 1024;
  const s = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return `${(b / Math.pow(k, i)).toFixed(1)} ${s[i]}`;
};
const fmtDate = (d) => {
  if (!d) return '';
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

/* file "kind" classification — used for icons, thumbnails & open behaviour */
const kindOf = (ct = '', name = '') => {
  const ext = (name.split('.').pop() || '').toLowerCase();
  if (ct.startsWith('image/')) return 'image';
  if (ct.startsWith('video/')) return 'video';
  if (ct.startsWith('audio/')) return 'audio';
  if (ct.includes('pdf') || ext === 'pdf') return 'pdf';
  if (ct === 'text/html' || ext === 'html' || ext === 'htm') return 'html';
  if (ct.startsWith('text/') || ['txt', 'md', 'json', 'xml', 'csv', 'log'].includes(ext)) return 'text';
  if (['js', 'jsx', 'ts', 'tsx', 'css', 'py', 'java', 'c', 'cpp', 'sh'].includes(ext)) return 'code';
  return 'other';
};

/* files that should open directly in a new browser tab instead of the docked viewer */
const opensInNewTab = (ct, name) => ['html', 'text', 'code', 'pdf'].includes(kindOf(ct, name));

const iconForType = (ct = '', name = '') => {
  const k = kindOf(ct, name);
  if (k === 'image') return <ImageIcon size={20} />;
  if (k === 'video') return <Video size={20} />;
  if (k === 'audio') return <Music size={20} />;
  if (k === 'pdf') return <FileText size={20} color="#dc2626" />;
  if (k === 'html') return <FileCode size={20} color="#f97316" />;
  if (k === 'text' || k === 'code') return <FileType size={20} color="#3b82f6" />;
  return <FileIcon size={20} />;
};
const bigIconForType = (ct = '', size = 40, name = '') => {
  const k = kindOf(ct, name);
  if (k === 'image') return <ImageIcon size={size} />;
  if (k === 'video') return <Video size={size} />;
  if (k === 'audio') return <Music size={size} />;
  if (k === 'pdf') return <FileText size={size} color="#dc2626" />;
  if (k === 'html') return <FileCode size={size} color="#f97316" />;
  if (k === 'text' || k === 'code') return <FileType size={size} color="#3b82f6" />;
  return <FileIcon size={size} />;
};

/* SHA-256 hash of a File — used for duplicate detection */
async function hashFile(file) {
  try {
    const buf = await file.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return null; /* hashing unsupported (very old browser) — skip check */
  }
}

/* Default folder seeds using icon keys */
const STUDY_SEED = [
  { name: 'Reasoning', icon: 'brain', children: [
    { name: 'Logical Reasoning', icon: 'puzzle' },
    { name: 'Seating Arrangement', icon: 'layers' },
    { name: 'Puzzles', icon: 'puzzle' },
  ]},
  { name: 'English', icon: 'book-open', children: [
    { name: 'Grammar', icon: 'languages' },
    { name: 'Reading Comprehension', icon: 'scroll' },
  ]},
  { name: 'Quant', icon: 'calculator', children: [
    { name: 'Arithmetic', icon: 'pie-chart' },
    { name: 'Data Interpretation', icon: 'trending-up' },
  ]},
  { name: 'General Knowledge', icon: 'globe', children: [
    { name: 'Current Affairs', icon: 'newspaper' },
    { name: 'Banking Awareness', icon: 'landmark' },
  ]},
];
const MEDIA_SEED = [
  { name: 'Photos', icon: 'image' },
  { name: 'Videos', icon: 'video' },
  { name: 'Documents', icon: 'file-text' },
  { name: 'Audio', icon: 'music' },
];

/* ==================== LOGIN ==================== */
function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const handleGoogle = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) { toast.error(error.message); setLoading(false); }
  };
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg-main)' }}>
      <div className="w-full max-w-md rounded-2xl p-8 sm:p-10 fade-in glass" style={{ boxShadow: 'var(--shadow-lg)' }}>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 mx-auto accent-bg">
          <Sparkles color="white" size={28} />
        </div>
        <h1 className="text-4xl font-heading text-center mb-2">VaultX</h1>
        <p className="text-center mb-8 text-sm" style={{ color: 'var(--text-muted)' }}>
          Your personal knowledge & media vault.
        </p>
        <button
          onClick={handleGoogle}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-3 rounded-xl font-medium accent-bg text-white transition-all hover:opacity-90 disabled:opacity-60"
        >
          {loading ? <div className="spinner" style={{ borderTopColor: 'white' }} /> : (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Sign in with Google
            </>
          )}
        </button>
        <p className="text-xs text-center mt-6" style={{ color: 'var(--text-muted)' }}>
          Secured by Supabase • Files private & encrypted at rest
        </p>
      </div>
    </div>
  );
}

/* ==================== MAIN APP ==================== */
function VaultApp({ session }) {
  const user = session.user;
  const userId = user.id;
  const { profile, updateProfile } = useAuth();
  const vaultAvatarStyle = profile?.avatar_style || 'fox';
  const displayName = profile?.display_name || user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'You';

  /* ---- theme + dark mode — single global source of truth (user_profile), same as
     the login screen, dashboard, CodeForge, and Profile page. Editing the theme here
     updates the shared profile so every page reflects it immediately, on every device. ---- */
  const themeMode = profile?.theme_mode || 'system';
  const [systemDark, setSystemDark] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemDark(mq.matches);
    const onChange = () => setSystemDark(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  const dark = resolveDark(profile, systemDark);
  const themeId = profile?.app_theme_id || 'terra';
  const isRandom = false; // "surprise me" resolves to a concrete themeId at save time, so nothing stays permanently random

  useEffect(() => { applyTheme(themeId, dark); }, [themeId, dark]);

  const persistDark = (v) => updateProfile({ theme_mode: v ? 'dark' : 'light' });

  const persistTheme = async (newThemeId, random) => {
    await updateProfile({ app_theme_id: random ? pickRandomThemeId() : newThemeId });
  };

  /* ---- app state ---- */
  const [module, setModule] = useState('study');
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [view, setView] = useState('grid');
  const [sortBy, setSortBy] = useState('date'); // 'date' | 'name' | 'size'
  const [expanded, setExpanded] = useState({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [uploads, setUploads] = useState([]);

  /* mobile / responsive UI */
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);


  /* modals */
  const [uploadOpen, setUploadOpen] = useState(false);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderParent, setNewFolderParent] = useState(null);
  const [themePickerOpen, setThemePickerOpen] = useState(false);
  const [pendingTheme, setPendingTheme] = useState(null);

  const [quickFilter, setQuickFilter] = useState(null); // 'favorites' | 'pdfs' | 'videos' | 'images' | 'audio'
  const [moveTarget, setMoveTarget] = useState(null); // for bulk-move modal: array of file ids
  const [renameTarget, setRenameTarget] = useState(null); // file being renamed
  const [propertiesTarget, setPropertiesTarget] = useState(null); // file whose properties are shown
  const [editTarget, setEditTarget] = useState(null); // text/code file being edited inline

  /* bulk selection */
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const toggleSelected = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const clearSelection = () => { setSelectedIds(new Set()); setBulkMode(false); };

  /* multi-tab file viewer */
  const [tabs, setTabs] = useState([]); // {id, file, url}
  const [activeTabId, setActiveTabId] = useState(null);

  /* thumbnails: fileId -> signed URL (1h) */
  const [thumbUrls, setThumbUrls] = useState({});

  const loadData = useCallback(async () => {
    setLoading(true);
    const [{ data: fData }, { data: fiData }] = await Promise.all([
      supabase.from('folders').select('*').order('created_at', { ascending: true }),
      supabase.from('files').select('*').order('created_at', { ascending: false }),
    ]);
    let localFolders = fData || [];
    if (localFolders.length === 0) {
      const seedRows = [];
      for (const s of STUDY_SEED) seedRows.push({ user_id: userId, name: s.name, icon: s.icon, module: 'study', parent_id: null });
      for (const s of MEDIA_SEED) seedRows.push({ user_id: userId, name: s.name, icon: s.icon, module: 'media', parent_id: null });
      const { data: inserted } = await supabase.from('folders').insert(seedRows).select();
      if (inserted) {
        const childRows = [];
        for (const parent of inserted.filter((f) => f.module === 'study')) {
          const seed = STUDY_SEED.find((s) => s.name === parent.name);
          if (seed?.children) for (const c of seed.children) childRows.push({ user_id: userId, name: c.name, module: 'study', parent_id: parent.id, icon: c.icon });
        }
        if (childRows.length) await supabase.from('folders').insert(childRows);
      }
      const { data: refetch } = await supabase.from('folders').select('*').order('created_at', { ascending: true });
      localFolders = refetch || [];
    }
    setFolders(localFolders);
    setFiles(fiData || []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { loadData(); }, [loadData]);

  /* generate thumbnails for image + video files (visible in current view) */
  useEffect(() => {
    const visualFiles = files.filter((f) => {
      const ct = f.content_type || '';
      return (ct.startsWith('image/') || ct.startsWith('video/')) && !thumbUrls[f.id];
    });
    if (visualFiles.length === 0) return;
    const paths = visualFiles.map((f) => f.storage_path);
    supabase.storage.from('vaultx').createSignedUrls(paths, 3600).then(({ data }) => {
      if (!data) return;
      const map = {};
      data.forEach((r, i) => {
        if (r?.signedUrl) map[visualFiles[i].id] = r.signedUrl;
      });
      if (Object.keys(map).length) setThumbUrls((prev) => ({ ...prev, ...map }));
    });
  }, [files, thumbUrls]);

  const moduleFolders = useMemo(() => folders.filter((f) => f.module === module), [folders, module]);
  const rootFolders = useMemo(() => moduleFolders.filter((f) => !f.parent_id), [moduleFolders]);
  const childrenOf = (id) => moduleFolders.filter((f) => f.parent_id === id);

  const currentFiles = useMemo(() => {
    let list = files.filter((f) => f.module === module);
    if (currentFolder) {
      const descendantIds = new Set([currentFolder.id]);
      const stack = [currentFolder.id];
      while (stack.length) {
        const id = stack.pop();
        for (const c of moduleFolders.filter((f) => f.parent_id === id)) {
          descendantIds.add(c.id);
          stack.push(c.id);
        }
      }
      list = list.filter((f) => descendantIds.has(f.folder_id));
    }
    const sorted = [...list];
    if (sortBy === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === 'size') sorted.sort((a, b) => (b.size || 0) - (a.size || 0));
    else sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return sorted;
  }, [files, module, currentFolder, moduleFolders, sortBy]);

  /* search results — categorised */
  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return null;
    const modFolders = moduleFolders.filter((f) => f.name.toLowerCase().includes(q));
    const modFiles = files.filter((f) => f.module === module && (f.name.toLowerCase().includes(q) || (f.tags || []).some((t) => t.toLowerCase().includes(q))));
    const grouped = {
      folders: modFolders,
      pdfs: modFiles.filter((f) => (f.content_type || '').includes('pdf')),
      images: modFiles.filter((f) => (f.content_type || '').startsWith('image/')),
      videos: modFiles.filter((f) => (f.content_type || '').startsWith('video/')),
      audio: modFiles.filter((f) => (f.content_type || '').startsWith('audio/')),
      others: modFiles.filter((f) => {
        const c = f.content_type || '';
        return !c.includes('pdf') && !c.startsWith('image/') && !c.startsWith('video/') && !c.startsWith('audio/');
      }),
    };
    grouped.total = modFolders.length + modFiles.length;
    return grouped;
  }, [search, files, module, moduleFolders]);

  const totalBytes = useMemo(() => files.reduce((s, f) => s + (f.size || 0), 0), [files]);
  const storageQuotaGB = 5;
  const usedPct = Math.min(100, (totalBytes / (storageQuotaGB * 1024 * 1024 * 1024)) * 100);

  /* actions */
  const createFolder = async (name, parentId, mod, icon = 'folder') => {
    if (!name?.trim()) return;
    const { data, error } = await supabase.from('folders')
      .insert({ user_id: userId, name: name.trim(), parent_id: parentId || null, module: mod, icon })
      .select().single();
    if (error) return toast.error(error.message);
    setFolders((p) => [...p, data]);
    toast.success(`Folder "${name}" created`);
    if (parentId) setExpanded((p) => ({ ...p, [parentId]: true }));
  };

  const deleteFolder = async (folder) => {
    if (!confirm(`Delete folder "${folder.name}" and all its contents?`)) return;
    const isDesc = (fid, target) => {
      let cur = folders.find((x) => x.id === fid);
      while (cur) { if (cur.id === target) return true; cur = folders.find((x) => x.id === cur.parent_id); }
      return false;
    };
    const filesToDelete = files.filter((f) => f.folder_id && isDesc(f.folder_id, folder.id));
    const paths = filesToDelete.map((f) => f.storage_path);
    if (paths.length) await supabase.storage.from('vaultx').remove(paths);
    await supabase.from('folders').delete().eq('id', folder.id);
    toast.success('Folder deleted');
    if (currentFolder?.id === folder.id) setCurrentFolder(null);
    loadData();
  };

  const deleteFile = async (file) => {
    if (!confirm(`Delete "${file.name}"?`)) return;
    await supabase.storage.from('vaultx').remove([file.storage_path]);
    await supabase.from('files').delete().eq('id', file.id);
    setFiles((p) => p.filter((x) => x.id !== file.id));
    setTabs((p) => p.filter((t) => t.file.id !== file.id));
    toast.success('File deleted');
  };

  const bulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (!confirm(`Delete ${ids.length} file(s)?`)) return;
    const paths = files.filter((f) => ids.includes(f.id)).map((f) => f.storage_path);
    if (paths.length) await supabase.storage.from('vaultx').remove(paths);
    await supabase.from('files').delete().in('id', ids);
    setFiles((p) => p.filter((x) => !ids.includes(x.id)));
    setTabs((p) => p.filter((t) => !ids.includes(t.file.id)));
    toast.success(`Deleted ${ids.length} file(s)`);
    clearSelection();
  };

  const bulkDownload = async () => {
    const ids = Array.from(selectedIds);
    const items = files.filter((f) => ids.includes(f.id));
    toast.info(`Preparing ${items.length} downloads…`);
    for (const f of items) {
      const { data } = await supabase.storage.from('vaultx').createSignedUrl(f.storage_path, 600);
      if (data?.signedUrl) {
        const a = document.createElement('a');
        a.href = data.signedUrl;
        a.download = f.name;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        a.remove();
        await new Promise((r) => setTimeout(r, 400));
      }
    }
    clearSelection();
  };

  const bulkMove = async (targetFolderId) => {
    const ids = Array.from(selectedIds);
    await supabase.from('files').update({ folder_id: targetFolderId }).in('id', ids);
    setFiles((p) => p.map((f) => (ids.includes(f.id) ? { ...f, folder_id: targetFolderId } : f)));
    toast.success(`Moved ${ids.length} file(s)`);
    clearSelection();
    setMoveTarget(null);
  };

  const toggleFavorite = async (file) => {
    const { data } = await supabase.from('files').update({ is_favorite: !file.is_favorite }).eq('id', file.id).select().single();
    if (data) setFiles((p) => p.map((f) => (f.id === file.id ? data : f)));
  };

  const editFileContent = async (file, newContent) => {
    const blob = new Blob([newContent], { type: file.content_type || 'text/plain' });
    const { error } = await supabase.storage.from('vaultx').upload(file.storage_path, blob, { upsert: true, contentType: file.content_type || 'text/plain' });
    if (error) return toast.error(error.message);
    await supabase.from('files').update({ size: blob.size }).eq('id', file.id);
    setFiles((p) => p.map((f) => (f.id === file.id ? { ...f, size: blob.size } : f)));
    toast.success('File saved');
  };

  const renameFile = async (file, newName) => {
    if (!newName?.trim() || newName === file.name) return;
    const { data, error } = await supabase.from('files').update({ name: newName.trim() }).eq('id', file.id).select().single();
    if (error) return toast.error(error.message);
    setFiles((p) => p.map((f) => (f.id === file.id ? data : f)));
    setTabs((p) => p.map((t) => (t.file.id === file.id ? { ...t, file: data } : t)));
    toast.success('Renamed');
  };

  /* open file — routes to a new browser tab for HTML/text/code/PDF, else the docked viewer */
  const openInTab = async (file) => {
    if (opensInNewTab(file.content_type, file.name)) {
      const { data, error } = await supabase.storage.from('vaultx').createSignedUrl(file.storage_path, 3600);
      if (error) return toast.error(error.message);
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    const existing = tabs.find((t) => t.file.id === file.id);
    if (existing) { setActiveTabId(existing.id); return; }
    const { data, error } = await supabase.storage.from('vaultx').createSignedUrl(file.storage_path, 3600);
    if (error) return toast.error(error.message);
    const tab = { id: crypto.randomUUID(), file, url: data.signedUrl };
    setTabs((p) => [...p, tab]);
    setActiveTabId(tab.id);
  };
  const closeTab = (id) => {
    setTabs((p) => p.filter((t) => t.id !== id));
    if (activeTabId === id) setActiveTabId(null);
  };
  const navigateInMedia = async (nextFile) => {
    const t = tabs.find((x) => x.file.id === nextFile.id);
    if (t) { setActiveTabId(t.id); return; }
    // replace current tab with new file
    const { data } = await supabase.storage.from('vaultx').createSignedUrl(nextFile.storage_path, 3600);
    if (!data) return;
    setTabs((p) => p.map((t) => t.id === activeTabId ? { ...t, file: nextFile, url: data.signedUrl } : t));
  };

  const shareTab = async (tab) => shareFile(tab.file);
  const downloadTab = async (tab) => downloadFile(tab.file);

  const shareFile = async (file) => {
    const { data, error } = await supabase.storage.from('vaultx').createSignedUrl(file.storage_path, 60 * 60 * 24 * 7);
    if (error) return toast.error(error.message);
    try {
      await navigator.clipboard.writeText(data.signedUrl);
      toast.success('Share link copied (valid 7 days)');
    } catch {
      prompt('Copy this share link (valid 7 days):', data.signedUrl);
    }
  };

  const downloadFile = async (file) => {
    const { data, error } = await supabase.storage.from('vaultx').createSignedUrl(file.storage_path, 600);
    if (error) return toast.error(error.message);
    const a = document.createElement('a');
    a.href = data.signedUrl;
    a.download = file.name;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  /* upload */
  const doUpload = async (fileList, targetFolder) => {
    const { data: { session: sess } } = await supabase.auth.getSession();
    if (!sess) return toast.error('Session expired');
    const projectRef = getProjectRef();

    for (const file of Array.from(fileList)) {
      /* ---- duplicate detection: hash, then name+size fallback ---- */
      const hash = await hashFile(file);
      const existing = files.find((f) => {
        if (hash && f.file_hash && f.file_hash === hash) return true;
        return f.name === file.name && f.size === file.size;
      });
      if (existing) {
        toast.warning(`"${file.name}" already exists in your vault — skipped duplicate.`);
        continue;
      }

      const id = crypto.randomUUID();
      const storagePath = `${userId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      setUploads((p) => [...p, { id, name: file.name, progress: 0, status: 'uploading' }]);
      await new Promise((resolve) => {
        const upload = new tus.Upload(file, {
          endpoint: `https://${projectRef}.supabase.co/storage/v1/upload/resumable`,
          retryDelays: [0, 3000, 5000, 10000, 20000],
          headers: { authorization: `Bearer ${sess.access_token}`, 'x-upsert': 'true' },
          uploadDataDuringCreation: true,
          removeFingerprintOnSuccess: true,
          metadata: { bucketName: 'vaultx', objectName: storagePath, contentType: file.type || 'application/octet-stream', cacheControl: '3600' },
          chunkSize: 6 * 1024 * 1024,
          onError: (err) => {
            console.error(err);
            toast.error(`Upload failed: ${file.name}`);
            setUploads((p) => p.map((u) => u.id === id ? { ...u, status: 'error' } : u));
            resolve();
          },
          onProgress: (u, t) => setUploads((p) => p.map((x) => x.id === id ? { ...x, progress: (u / t) * 100 } : x)),
          onSuccess: async () => {
            const { data: row } = await supabase.from('files').insert({
              user_id: userId,
              folder_id: targetFolder?.id || null,
              name: file.name,
              storage_path: storagePath,
              content_type: file.type || 'application/octet-stream',
              size: file.size,
              file_hash: hash,
              module,
            }).select().single();
            if (row) setFiles((p) => [row, ...p]);
            setUploads((p) => p.map((u) => u.id === id ? { ...u, status: 'done', progress: 100 } : u));
            toast.success(`Uploaded ${file.name}`);
            resolve();
          },
        });
        upload.start();
      });
    }
    setTimeout(() => setUploads((p) => p.filter((u) => u.status === 'uploading')), 3000);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (!currentFolder) { toast.warning('Open a folder first to upload files'); return; }
    doUpload(e.dataTransfer.files, currentFolder);
  };

  /* quick filter results */
  const quickFilterFiles = useMemo(() => {
    if (!quickFilter) return [];
    return files.filter((f) => {
      if (quickFilter === 'favorites') return f.is_favorite;
      if (quickFilter === 'pdfs') return (f.content_type || '').includes('pdf');
      if (quickFilter === 'videos') return (f.content_type || '').startsWith('video/');
      if (quickFilter === 'images') return (f.content_type || '').startsWith('image/');
      if (quickFilter === 'audio') return (f.content_type || '').startsWith('audio/');
      return true;
    });
  }, [files, quickFilter]);

  /* ==================== RENDER ==================== */
  return (
    <div className="vault-shell" style={{ paddingBottom: tabs.length > 0 ? 48 : 0 }}>
      {/* HEADER */}
      <header className="glass-strong flex items-center px-3 sm:px-6 gap-2 sm:gap-6" style={{ height: 60, flexShrink: 0, zIndex: 100 }}>
        {/* Mobile menu button */}
        <button onClick={() => setMobileNavOpen(true)} className="md:hidden p-2 -ml-1" style={{ color: 'var(--text-main)' }}>
          <Menu size={20} />
        </button>

        <div className="font-heading text-xl sm:text-2xl font-bold cursor-pointer" style={{ color: 'var(--accent-red)' }} onClick={() => { setCurrentFolder(null); setSearch(''); setQuickFilter(null); }}>
          <span className="hidden sm:inline">VaultX</span>
          <span className="sm:hidden">VX</span>
        </div>

        {/* Module toggle - desktop */}
        <div className="hidden md:flex gap-1 rounded-full p-1" style={{ background: 'var(--bg-hover)' }}>
          {['study', 'media'].map((m) => (
            <button
              key={m}
              onClick={() => { setModule(m); setCurrentFolder(null); setQuickFilter(null); }}
              className="px-4 py-1.5 rounded-full font-medium text-sm transition-all capitalize"
              style={{
                background: module === m ? 'var(--bg-surface)' : 'transparent',
                color: module === m ? 'var(--accent-red)' : 'var(--text-muted)',
                boxShadow: module === m ? 'var(--shadow-sm)' : 'none',
              }}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Module toggle - mobile pill */}
        <div className="md:hidden flex gap-1 rounded-full p-0.5 text-xs" style={{ background: 'var(--bg-hover)' }}>
          {['study', 'media'].map((m) => (
            <button
              key={m}
              onClick={() => { setModule(m); setCurrentFolder(null); setQuickFilter(null); }}
              className="px-3 py-1 rounded-full font-medium capitalize"
              style={{
                background: module === m ? 'var(--bg-surface)' : 'transparent',
                color: module === m ? 'var(--accent-red)' : 'var(--text-muted)',
              }}
            >
              {m === 'study' ? 'Study' : 'Media'}
            </button>
          ))}
        </div>

        {/* Desktop search */}
        <div className="hidden md:block flex-1 max-w-lg relative">
          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${module === 'study' ? 'Study' : 'Media'} — files, folders, tags…`}
            className="w-full pl-10 pr-4 py-2.5 rounded-full text-sm outline-none"
            style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
          />
        </div>

        <div className="flex items-center gap-1 sm:gap-2 ml-auto">
          {/* Mobile search icon */}
          <button onClick={() => setMobileSearchOpen(true)} className="md:hidden p-2" style={{ color: 'var(--text-main)' }}>
            <Search size={18} />
          </button>
          <button onClick={() => setUploadOpen(true)} className="p-2" style={{ color: 'var(--text-main)' }} title="Upload">
            <Upload size={18} />
          </button>
          <button onClick={() => setThemePickerOpen(true)} className="hidden sm:inline-flex p-2" style={{ color: 'var(--text-main)' }} title="Change accent theme">
            <Palette size={18} />
          </button>
          <button onClick={() => persistDark(!dark)} className="hidden sm:inline-flex p-2" style={{ color: 'var(--text-main)' }} title="Toggle theme">
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Profile avatar — clicking goes straight to /profile, no dropdown */}
          <Link
            href="/profile"
            className="flex items-center gap-2 pl-1 pr-1 sm:pr-3 py-1 rounded-full transition-all hover:opacity-85"
            style={{ border: '1px solid var(--border-color)', background: 'var(--bg-surface)' }}
            title="Profile & settings"
          >
            {(() => {
              const av = getAvatar(vaultAvatarStyle);
              return (
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0" style={{ background: av.bg }}>
                  {av.emoji}
                </div>
              );
            })()}
            <span className="hidden sm:inline text-sm font-medium">{displayName}</span>
          </Link>
        </div>
      </header>

      {/* Mobile search overlay */}
      {mobileSearchOpen && (
        <div className="md:hidden fixed inset-0 z-[110] flex flex-col fade-in" style={{ background: 'var(--bg-main)' }}>
          <div className="flex items-center gap-2 p-3" style={{ borderBottom: '1px solid var(--border-color)' }}>
            <button onClick={() => { setMobileSearchOpen(false); setSearch(''); }} className="p-2">
              <ArrowLeft size={20} />
            </button>
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${module}…`}
              className="flex-1 px-4 py-2.5 rounded-full text-sm outline-none"
              style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)' }}
            />
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <SearchResultsView results={searchResults} onOpenFolder={(f) => { setCurrentFolder(f); setMobileSearchOpen(false); setSearch(''); }} onOpenFile={(f) => { openInTab(f); setMobileSearchOpen(false); }} />
          </div>
        </div>
      )}

      {/* BODY */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile sidebar drawer */}
        {mobileNavOpen && (
          <div className="md:hidden fixed inset-0 z-[105] flex" onClick={() => setMobileNavOpen(false)}>
            <div className="w-72 h-full slide-left flex flex-col" style={{ background: 'var(--bg-surface)' }} onClick={(e) => e.stopPropagation()}>
              <SidebarContent
                loading={loading}
                module={module}
                rootFolders={rootFolders}
                childrenOf={childrenOf}
                expanded={expanded}
                setExpanded={setExpanded}
                currentFolder={currentFolder}
                setCurrentFolder={(f) => { setCurrentFolder(f); setMobileNavOpen(false); setQuickFilter(null); }}
                onAddSub={(p) => { setNewFolderParent(p); setNewFolderOpen(true); }}
                onDelete={deleteFolder}
                onNewRoot={() => { setNewFolderParent(null); setNewFolderOpen(true); }}
              />
            </div>
            <div className="flex-1" style={{ background: 'rgba(0,0,0,0.4)' }} />
          </div>
        )}

        {/* Desktop left sidebar */}
        <aside className="hidden md:flex w-64 lg:w-64 overflow-y-auto py-4 px-2 flex-col" style={{ background: 'var(--bg-surface)', borderRight: '1px solid var(--border-color)' }}>
          <SidebarContent
            loading={loading}
            module={module}
            rootFolders={rootFolders}
            childrenOf={childrenOf}
            expanded={expanded}
            setExpanded={setExpanded}
            currentFolder={currentFolder}
            setCurrentFolder={(f) => { setCurrentFolder(f); setQuickFilter(null); }}
            onAddSub={(p) => { setNewFolderParent(p); setNewFolderOpen(true); }}
            onDelete={deleteFolder}
            onNewRoot={() => { setNewFolderParent(null); setNewFolderOpen(true); }}
          />
        </aside>

        {/* MAIN */}
        <main
          className="flex-1 flex flex-col relative min-w-0"
          style={{ background: 'var(--bg-main)' }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          {dragOver && (
            <div className="absolute inset-4 rounded-2xl flex items-center justify-center pointer-events-none z-40" style={{ background: 'var(--accent-soft)', border: '2px dashed var(--accent-red)' }}>
              <div className="text-center">
                <Upload size={40} style={{ color: 'var(--accent-red)', margin: '0 auto 12px' }} />
                <p className="font-heading text-2xl" style={{ color: 'var(--accent-red)' }}>Drop to upload</p>
              </div>
            </div>
          )}

          {/* Bulk action bar */}
          {bulkMode && selectedIds.size > 0 && (
            <div className="glass sticky top-0 z-30 flex items-center justify-between gap-2 px-4 py-2.5 fade-in" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <div className="text-sm font-medium">{selectedIds.size} selected</div>
              <div className="flex items-center gap-2">
                <button onClick={() => setMoveTarget(Array.from(selectedIds))} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
                  <FolderInput size={14} /> Move
                </button>
                <button onClick={bulkDownload} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
                  <Download size={14} /> <span className="hidden sm:inline">Download</span>
                </button>
                <button onClick={bulkDelete} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-white" style={{ background: '#dc2626' }}>
                  <Trash2 size={14} /> <span className="hidden sm:inline">Delete</span>
                </button>
                <button onClick={clearSelection} className="px-2 py-1.5 text-sm" style={{ color: 'var(--text-muted)' }}>Cancel</button>
              </div>
            </div>
          )}

          {/* Toolbar */}
          <div className="flex justify-between items-center px-4 sm:px-8 pt-4 sm:pt-6 pb-3 gap-3">
            <h2 className="font-heading text-xl sm:text-3xl truncate min-w-0" style={{ color: 'var(--text-main)' }}>
              {currentFolder ? (
                <>
                  <span className="cursor-pointer text-sm sm:text-lg" style={{ color: 'var(--text-muted)' }} onClick={() => setCurrentFolder(null)}>
                    {module === 'study' ? 'Study' : 'Media'}
                  </span>
                  <span className="text-sm sm:text-lg mx-2" style={{ color: 'var(--text-muted)' }}>›</span>
                  {currentFolder.name}
                </>
              ) : (
                module === 'study' ? 'Study Hub' : 'Media Hub'
              )}
            </h2>
            <div className="flex items-center gap-2 flex-shrink-0">
              {currentFolder && currentFiles.length > 0 && !bulkMode && (
                <button onClick={() => setBulkMode(true)} className="p-1.5 rounded-lg text-sm" style={{ color: 'var(--text-muted)' }} title="Select multiple">
                  <CheckSquare size={16} />
                </button>
              )}
              {currentFolder && currentFiles.length > 1 && (
                <button
                  onClick={() => setSortBy((p) => (p === 'date' ? 'name' : p === 'name' ? 'size' : 'date'))}
                  className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}
                  title="Change sort order"
                >
                  <ArrowUpDown size={13} /> {sortBy === 'date' ? 'Newest' : sortBy === 'name' ? 'Name' : 'Size'}
                </button>
              )}
              {currentFolder && (
                <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
                  <button onClick={() => setView('grid')} className="px-2 sm:px-3 py-1.5 rounded flex items-center gap-1.5 text-sm" style={{ background: view === 'grid' ? 'var(--bg-main)' : 'transparent', color: view === 'grid' ? 'var(--accent-red)' : 'var(--text-muted)' }}>
                    <LayoutGrid size={14} /> <span className="hidden sm:inline">Grid</span>
                  </button>
                  <button onClick={() => setView('list')} className="px-2 sm:px-3 py-1.5 rounded flex items-center gap-1.5 text-sm" style={{ background: view === 'list' ? 'var(--bg-main)' : 'transparent', color: view === 'list' ? 'var(--accent-red)' : 'var(--text-muted)' }}>
                    <List size={14} /> <span className="hidden sm:inline">List</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 sm:px-8 pb-24">
            {/* Search results (desktop inline) */}
            {searchResults && !mobileSearchOpen && (
              <div className="mb-6 hidden md:block">
                <div className="text-xs uppercase tracking-wide font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>
                  {searchResults.total} results for &quot;{search}&quot;
                </div>
                <SearchResultsView results={searchResults} onOpenFolder={(f) => { setCurrentFolder(f); setSearch(''); }} onOpenFile={(f) => { openInTab(f); setSearch(''); }} />
                <div className="mt-6" style={{ borderTop: '1px solid var(--border-color)' }} />
              </div>
            )}

            {/* Dashboard */}
            {!currentFolder && !searchResults && (
              <div className="grid gap-4 sm:gap-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
                {rootFolders.map((f) => {
                  const chain = new Set([f.id]); const stack = [f.id];
                  while (stack.length) {
                    const id = stack.pop();
                    for (const c of moduleFolders.filter((y) => y.parent_id === id)) { chain.add(c.id); stack.push(c.id); }
                  }
                  const inside = files.filter((x) => x.folder_id && chain.has(x.folder_id));
                  const subCount = childrenOf(f.id).length;
                  return (
                    <div
                      key={f.id}
                      className="card-hover p-5 rounded-xl cursor-pointer fade-in"
                      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}
                      onClick={() => setCurrentFolder(f)}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="font-heading text-lg sm:text-xl">{f.name}</div>
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-soft)', color: 'var(--accent-red)' }}>
                          <FolderIcon name={f.icon} size={20} />
                        </div>
                      </div>
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                        {subCount} {module === 'study' ? 'chapters' : 'sub-folders'} • {inside.length} files
                      </p>
                      <div className="flex justify-between mt-3 pt-3 text-xs" style={{ borderTop: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                        <span>{fmtSize(inside.reduce((s, x) => s + (x.size || 0), 0))}</span>
                        <span>Open →</span>
                      </div>
                    </div>
                  );
                })}
                {rootFolders.length === 0 && !loading && (
                  <div className="col-span-full text-center py-20" style={{ color: 'var(--text-muted)' }}>
                    <FolderPlus size={40} style={{ margin: '0 auto 12px' }} />
                    <p>No folders yet. Tap &quot;New Subject/Folder&quot; in sidebar.</p>
                  </div>
                )}
              </div>
            )}

            {/* Folder view */}
            {currentFolder && !searchResults && (
              <>
                {childrenOf(currentFolder.id).length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-xs uppercase tracking-wide font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>Sub-folders</h3>
                    <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
                      {childrenOf(currentFolder.id).map((c) => (
                        <div
                          key={c.id}
                          onClick={() => setCurrentFolder(c)}
                          className="flex items-center gap-3 p-3 rounded-lg cursor-pointer card-hover"
                          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}
                        >
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--accent-soft)', color: 'var(--accent-red)' }}>
                            <FolderIcon name={c.icon} size={18} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{c.name}</div>
                            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                              {files.filter((x) => x.folder_id === c.id).length} files
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {currentFiles.length === 0 ? (
                  <div className="text-center py-16 fade-in" style={{ color: 'var(--text-muted)' }}>
                    <Upload size={40} style={{ margin: '0 auto 12px' }} />
                    <p className="mb-4">No files here yet.</p>
                    <button onClick={() => setUploadOpen(true)} className="px-4 py-2 rounded-lg text-sm font-medium accent-bg text-white">
                      Upload files
                    </button>
                    <p className="text-xs mt-3">or drag & drop anywhere</p>
                  </div>
                ) : view === 'grid' ? (
                  <div className="grid gap-3 sm:gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
                    {currentFiles.map((file) => (
                      <FileGridCard
                        key={file.id}
                        file={file}
                        thumbUrl={thumbUrls[file.id]}
                        selected={selectedIds.has(file.id)}
                        bulkMode={bulkMode}
                        onOpen={() => bulkMode ? toggleSelected(file.id) : openInTab(file)}
                        onToggleSelect={() => toggleSelected(file.id)}
                        onFavorite={() => toggleFavorite(file)}
                        onDownload={() => downloadFile(file)}
                        onShare={() => shareFile(file)}
                        onDelete={() => deleteFile(file)}
                        onRename={() => setRenameTarget(file)}
                        onProperties={() => setPropertiesTarget(file)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col gap-1">
                    <div className="hidden sm:grid px-4 py-3 text-xs uppercase tracking-wide font-bold" style={{ gridTemplateColumns: bulkMode ? 'auto 2fr 1fr 1fr 1fr auto' : '2fr 1fr 1fr 1fr auto', gap: 12, color: 'var(--text-muted)', borderBottom: '2px solid var(--border-color)' }}>
                      {bulkMode && <div></div>}
                      <div>Name</div><div>Type</div><div>Size</div><div>Uploaded</div><div>Actions</div>
                    </div>
                    {currentFiles.map((file) => (
                      <FileListRow
                        key={file.id}
                        file={file}
                        selected={selectedIds.has(file.id)}
                        bulkMode={bulkMode}
                        onOpen={() => bulkMode ? toggleSelected(file.id) : openInTab(file)}
                        onToggleSelect={() => toggleSelected(file.id)}
                        onFavorite={() => toggleFavorite(file)}
                        onShare={() => shareFile(file)}
                        onDelete={() => deleteFile(file)}
                        onDownload={() => downloadFile(file)}
                        onRename={() => setRenameTarget(file)}
                        onProperties={() => setPropertiesTarget(file)}
                        onEdit={() => setEditTarget(file)}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Upload FAB — hidden on dashboard AND when a file tab is open */}
          {currentFolder && !activeTabId && (
            <button
              onClick={() => setUploadOpen(true)}
              className="absolute right-4 sm:right-8 w-14 h-14 rounded-full flex items-center justify-center accent-bg text-white transition-all hover:scale-105"
              style={{ boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)', zIndex: 45, bottom: tabs.length > 0 ? 62 : 24 }}
              title="Upload"
            >
              <Plus size={24} />
            </button>
          )}

          {/* Ongoing uploads */}
          {uploads.length > 0 && (
            <div className="absolute right-4 sm:right-8 w-72 sm:w-80 rounded-xl p-4 fade-in" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-lg)', zIndex: 45, bottom: tabs.length > 0 ? 130 : 92 }}>
              <div className="text-sm font-semibold mb-3">Uploads</div>
              {uploads.map((u) => (
                <div key={u.id} className="mb-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="truncate mr-2">{u.name}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{Math.round(u.progress)}%</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-hover)' }}>
                    <div className="h-full transition-all" style={{ width: `${u.progress}%`, background: u.status === 'error' ? '#dc2626' : 'var(--accent-red)' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        {/* RIGHT SIDEBAR — desktop only, lg+ */}
        <aside className="hidden lg:flex w-72 overflow-y-auto p-6 flex-col gap-6" style={{ background: 'var(--bg-surface)', borderLeft: '1px solid var(--border-color)' }}>
          <div>
            <h3 className="text-xs uppercase tracking-wide font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>Storage</h3>
            <div className="h-1.5 rounded-full overflow-hidden mb-2" style={{ background: 'var(--bg-hover)' }}>
              <div className="h-full accent-bg" style={{ width: `${usedPct}%` }} />
            </div>
            <div className="flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
              <span>{fmtSize(totalBytes)} used</span>
              <span>{storageQuotaGB} GB</span>
            </div>
          </div>

          <div>
            <h3 className="text-xs uppercase tracking-wide font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>Quick Filters</h3>
            <div className="flex flex-col gap-1">
              <QuickFilterBtn icon={<Star size={14} />} label="Favorites" count={files.filter((f) => f.is_favorite).length} onClick={() => setQuickFilter('favorites')} />
              <QuickFilterBtn icon={<FileText size={14} />} label="PDFs" count={files.filter((f) => (f.content_type || '').includes('pdf')).length} onClick={() => setQuickFilter('pdfs')} />
              <QuickFilterBtn icon={<Video size={14} />} label="Videos" count={files.filter((f) => (f.content_type || '').startsWith('video/')).length} onClick={() => setQuickFilter('videos')} />
              <QuickFilterBtn icon={<ImageIcon size={14} />} label="Images" count={files.filter((f) => (f.content_type || '').startsWith('image/')).length} onClick={() => setQuickFilter('images')} />
              <QuickFilterBtn icon={<Music size={14} />} label="Audio" count={files.filter((f) => (f.content_type || '').startsWith('audio/')).length} onClick={() => setQuickFilter('audio')} />
            </div>
          </div>

          <div>
            <h3 className="text-xs uppercase tracking-wide font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>Recent Activity</h3>
            {files.slice(0, 5).map((f) => (
              <div key={f.id} className="flex gap-3 mb-3 text-sm cursor-pointer" onClick={() => openInTab(f)}>
                <div className="w-2 h-2 rounded-full mt-2 accent-bg" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{f.name}</div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{fmtDate(f.created_at)}</div>
                </div>
              </div>
            ))}
            {files.length === 0 && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No activity yet</p>}
          </div>
        </aside>
      </div>

      {/* Bottom-docked tabs */}
      <TabsDock
        tabs={tabs}
        activeTabId={activeTabId}
        siblings={currentFiles}
        onSetActive={setActiveTabId}
        onCloseTab={closeTab}
        onShare={(t) => shareTab(t)}
        onDownload={(t) => downloadTab(t)}
        onFavorite={(t) => toggleFavorite(t.file)}
        onDelete={async (t) => {
          if (!confirm(`Delete "${t.file.name}"?`)) return false;
          await supabase.storage.from('vaultx').remove([t.file.storage_path]);
          await supabase.from('files').delete().eq('id', t.file.id);
          setFiles((p) => p.filter((x) => x.id !== t.file.id));
          setTabs((p) => p.filter((x) => x.id !== t.id));
          toast.success('File deleted');
          return true;
        }}
        onNavigateInImage={navigateInMedia}
        onNavigateInVideo={navigateInMedia}
      />

      {/* Modals */}
      {uploadOpen && (
        <UploadModal
          onClose={() => setUploadOpen(false)}
          folders={moduleFolders}
          defaultFolder={currentFolder}
          onUpload={(files, folder) => { doUpload(files, folder); setUploadOpen(false); }}
        />
      )}
      {newFolderOpen && (
        <NewFolderModal
          parent={newFolderParent}
          onClose={() => setNewFolderOpen(false)}
          onCreate={(name, icon) => { createFolder(name, newFolderParent?.id, module, icon); setNewFolderOpen(false); }}
        />
      )}
      {themePickerOpen && (
        <ThemePickerModal
          currentThemeId={themeId}
          isRandom={isRandom}
          onClose={() => setThemePickerOpen(false)}
          onPick={(t, random) => { setPendingTheme({ id: t, random }); setThemePickerOpen(false); }}
        />
      )}
      {pendingTheme && (
        <ConfirmModal
          title="Apply theme?"
          message={pendingTheme.random ? 'Random will pick a new theme every time you open VaultX.' : `Apply the ${THEMES[pendingTheme.id]?.name} theme?`}
          confirmLabel="Apply"
          onCancel={() => setPendingTheme(null)}
          onConfirm={() => { persistTheme(pendingTheme.id, pendingTheme.random); setPendingTheme(null); toast.success('Theme applied'); }}
        />
      )}
      {quickFilter && (
        <QuickFilterModal
          type={quickFilter}
          files={quickFilterFiles}
          onClose={() => setQuickFilter(null)}
          onOpenFile={(f) => { openInTab(f); setQuickFilter(null); }}
        />
      )}
      {moveTarget && (
        <MoveModal
          folders={moduleFolders}
          onCancel={() => setMoveTarget(null)}
          onMove={(folderId) => bulkMove(folderId)}
        />
      )}
      {renameTarget && (
        <RenameModal
          file={renameTarget}
          onClose={() => setRenameTarget(null)}
          onRename={(newName) => { renameFile(renameTarget, newName); setRenameTarget(null); }}
        />
      )}
      {propertiesTarget && (
        <PropertiesModal
          file={propertiesTarget}
          folders={folders}
          onClose={() => setPropertiesTarget(null)}
        />
      )}
      {editTarget && (
        <EditFileModal
          file={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={(content) => { editFileContent(editTarget, content); setEditTarget(null); }}
        />
      )}
    </div>
  );
}

/* -------- Sidebar shared -------- */
function SidebarContent({ loading, module, rootFolders, childrenOf, expanded, setExpanded, currentFolder, setCurrentFolder, onAddSub, onDelete, onNewRoot }) {
  return (
    <div className="flex flex-col gap-1 h-full">
      <button
        onClick={() => setCurrentFolder(null)}
        className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
        style={{
          background: !currentFolder ? 'var(--accent-soft)' : 'transparent',
          color: !currentFolder ? 'var(--accent-red)' : 'var(--text-main)',
        }}
      >
        <Home size={16} /> Dashboard
      </button>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center gap-2 px-3 py-4 text-sm" style={{ color: 'var(--text-muted)' }}>
            <div className="spinner" /> Loading...
          </div>
        ) : rootFolders.map((f) => (
          <FolderNode
            key={f.id}
            folder={f}
            childrenOf={childrenOf}
            expanded={expanded}
            setExpanded={setExpanded}
            currentFolder={currentFolder}
            setCurrentFolder={setCurrentFolder}
            onAddSub={onAddSub}
            onDelete={onDelete}
          />
        ))}
      </div>

      <button
        onClick={onNewRoot}
        className="flex items-center gap-2 px-3 py-2 mt-2 rounded-lg text-sm border-dashed border transition-all"
        style={{ color: 'var(--text-muted)', borderColor: 'var(--border-color)' }}
      >
        <FolderPlus size={16} /> New {module === 'study' ? 'Subject' : 'Folder'}
      </button>
    </div>
  );
}

function FolderNode({ folder, childrenOf, expanded, setExpanded, currentFolder, setCurrentFolder, onAddSub, onDelete }) {
  const kids = childrenOf(folder.id);
  const isOpen = expanded[folder.id];
  const isActive = currentFolder?.id === folder.id;
  return (
    <div>
      <div
        className="flex items-center gap-1 px-2 py-2 rounded-lg text-sm cursor-pointer group transition-all"
        style={{
          background: isActive ? 'var(--accent-soft)' : 'transparent',
          color: isActive ? 'var(--accent-red)' : 'var(--text-main)',
        }}
      >
        {kids.length > 0 ? (
          <button onClick={(e) => { e.stopPropagation(); setExpanded((p) => ({ ...p, [folder.id]: !p[folder.id] })); }} className="p-0.5">
            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : (
          <span className="w-4" />
        )}
        <span className="flex-shrink-0" style={{ color: isActive ? 'var(--accent-red)' : 'var(--text-muted)' }}>
          <FolderIcon name={folder.icon} size={16} />
        </span>
        <span className="flex-1 truncate font-medium" onClick={() => setCurrentFolder(folder)}>{folder.name}</span>
        <div className="hidden group-hover:flex gap-1 flex-shrink-0">
          <button onClick={(e) => { e.stopPropagation(); onAddSub(folder); }} className="p-0.5" title="Add sub-folder"><Plus size={12} /></button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(folder); }} className="p-0.5" title="Delete"><Trash2 size={12} /></button>
        </div>
      </div>
      {isOpen && kids.length > 0 && (
        <div className="ml-4 mt-1 flex flex-col gap-0.5">
          {kids.map((c) => (
            <FolderNode key={c.id} folder={c} childrenOf={childrenOf} expanded={expanded} setExpanded={setExpanded} currentFolder={currentFolder} setCurrentFolder={setCurrentFolder} onAddSub={onAddSub} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

/* -------- File cards -------- */
function FileGridCard({ file, thumbUrl, selected, bulkMode, onOpen, onToggleSelect, onFavorite, onDownload, onShare, onDelete, onRename, onProperties }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const kind = kindOf(file.content_type, file.name);
  const isImage = kind === 'image';
  const isVideo = kind === 'video';
  const newTab = opensInNewTab(file.content_type, file.name);

  return (
    <div
      className="rounded-lg overflow-hidden cursor-pointer fade-in card-hover group relative"
      style={{ background: 'var(--bg-surface)', border: `1px solid ${selected ? 'var(--accent-red)' : 'var(--border-color)'}` }}
      onClick={onOpen}
    >
      {bulkMode && (
        <div className="absolute top-2 left-2 z-10" onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}>
          <div className={`bulk-check ${selected ? 'checked' : ''}`}>
            {selected && <Check size={14} color="white" />}
          </div>
        </div>
      )}
      <div className="h-24 sm:h-28 flex items-center justify-center relative overflow-hidden" style={{ background: kind === 'pdf' ? '#fef2f2' : kind === 'html' ? '#fff7ed' : kind === 'text' || kind === 'code' ? '#eff6ff' : 'var(--bg-hover)', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>
        {thumbUrl && isImage ? (
          <img src={thumbUrl} alt={file.name} loading="lazy" className="w-full h-full object-cover" />
        ) : thumbUrl && isVideo ? (
          <video
            src={thumbUrl}
            muted
            playsInline
            preload="metadata"
            onLoadedMetadata={(e) => { try { e.currentTarget.currentTime = 0.5; } catch { /* seek not allowed yet */ } }}
            className="w-full h-full object-cover pointer-events-none"
          />
        ) : (
          bigIconForType(file.content_type, 32, file.name)
        )}

        {/* "opens in new tab" indicator badge */}
        {newTab && (
          <div className="absolute bottom-1.5 right-1.5 p-1 rounded-full opacity-70" style={{ background: 'rgba(0,0,0,0.45)' }} title="Opens in new tab">
            <ExternalLink size={10} color="white" />
          </div>
        )}

        {!bulkMode && (
          <>
            {/* Top-right action cluster: Download + Favorite + More */}
            <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={(e) => { e.stopPropagation(); onDownload(); }} className="p-1.5 rounded-full shadow-sm" style={{ background: 'color-mix(in oklab, var(--bg-surface) 92%, transparent)' }} title="Download">
                <Download size={13} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); onFavorite(); }} className="p-1.5 rounded-full shadow-sm" style={{ background: 'color-mix(in oklab, var(--bg-surface) 92%, transparent)' }} title={file.is_favorite ? 'Unfavorite' : 'Favorite'}>
                <Star size={13} fill={file.is_favorite ? 'var(--accent-red)' : 'none'} color={file.is_favorite ? 'var(--accent-red)' : 'currentColor'} />
              </button>
              <div className="relative">
                <button onClick={(e) => { e.stopPropagation(); setMenuOpen((p) => !p); }} className="p-1.5 rounded-full shadow-sm" style={{ background: 'color-mix(in oklab, var(--bg-surface) 92%, transparent)' }} title="More">
                  <MoreVertical size={13} />
                </button>
                {menuOpen && (
                  <div
                    className="absolute right-0 top-8 w-36 rounded-lg p-1 z-20 fade-in"
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-lg)' }}
                    onClick={(e) => e.stopPropagation()}
                    onMouseLeave={() => setMenuOpen(false)}
                  >
                    <button onClick={() => { onRename(); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-left hover:bg-black/5"><Edit3 size={12} />Rename</button>
                    <button onClick={() => { onProperties(); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-left hover:bg-black/5"><Info size={12} />Properties</button>
                  </div>
                )}
              </div>
            </div>
            {/* Top-left: Share */}
            <button onClick={(e) => { e.stopPropagation(); onShare(); }} className="absolute top-1.5 left-1.5 p-1.5 rounded-full opacity-0 group-hover:opacity-100 shadow-sm" style={{ background: 'color-mix(in oklab, var(--bg-surface) 92%, transparent)' }} title="Copy share link">
              <Share2 size={13} />
            </button>
            {/* Bottom-right: Delete */}
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="absolute bottom-1.5 right-1.5 p-1.5 rounded-full opacity-0 group-hover:opacity-100 shadow-sm" style={{ background: 'color-mix(in oklab, var(--bg-surface) 92%, transparent)' }} title="Delete">
              <Trash2 size={13} />
            </button>

            {/* Persistent favorite star when true (visible without hover) */}
            {file.is_favorite && (
              <div className="absolute bottom-1.5 left-1.5 p-1 rounded-full opacity-100 group-hover:opacity-0 transition-opacity" style={{ background: 'color-mix(in oklab, var(--bg-surface) 92%, transparent)' }}>
                <Star size={12} fill="var(--accent-red)" color="var(--accent-red)" />
              </div>
            )}

            {/* Play badge for videos */}
            {isVideo && thumbUrl && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.55)' }}>
                  <Video size={18} color="white" />
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <div className="p-2.5">
        <div className="text-sm font-medium truncate mb-1">{file.name}</div>
        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{fmtSize(file.size)} • {fmtDate(file.created_at)}</div>
      </div>
    </div>
  );
}

function FileListRow({ file, selected, bulkMode, onOpen, onToggleSelect, onFavorite, onShare, onDelete, onDownload, onRename, onProperties, onEdit }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const kind = kindOf(file.content_type, file.name);
  const isEditable = kind === 'text' || kind === 'code' || kind === 'html';

  return (
    <div
      onClick={onOpen}
      className="grid px-3 sm:px-4 py-3 rounded-lg cursor-pointer items-center card-hover fade-in relative"
      style={{
        gridTemplateColumns: bulkMode ? 'auto 2fr 1fr 1fr 1fr auto' : '2fr 1fr 1fr 1fr auto',
        gap: 12,
        background: 'var(--bg-surface)',
        border: `1px solid ${selected ? 'var(--accent-red)' : 'transparent'}`,
      }}
    >
      {bulkMode && (
        <div onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}>
          <div className={`bulk-check ${selected ? 'checked' : ''}`}>
            {selected && <Check size={14} color="white" />}
          </div>
        </div>
      )}
      <div className="flex items-center gap-3 min-w-0">
        <span className="flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{iconForType(file.content_type, file.name)}</span>
        <div className="min-w-0">
          <div className="font-medium text-sm truncate">{file.name}</div>
          <div className="text-xs sm:hidden truncate" style={{ color: 'var(--text-muted)' }}>{fmtSize(file.size)} • {fmtDate(file.created_at)}</div>
        </div>
      </div>
      <div className="hidden sm:block text-xs uppercase font-semibold truncate" style={{ color: 'var(--text-muted)' }}>{kind}</div>
      <div className="hidden sm:block text-sm truncate" style={{ color: 'var(--text-muted)' }}>{fmtSize(file.size)}</div>
      <div className="hidden sm:block text-sm truncate" style={{ color: 'var(--text-muted)' }}>{fmtDate(file.created_at)}</div>

      {/* Quick actions: Open · Edit · Rename · Properties · Download · Delete */}
      <div className="flex gap-0.5 sm:gap-1 flex-shrink-0 items-center" onClick={(e) => e.stopPropagation()}>
        <button onClick={onOpen} className="p-1.5 hidden sm:inline-flex" title="Open" style={{ color: 'var(--text-muted)' }}><ExternalLink size={14} /></button>
        {isEditable && (
          <button onClick={onEdit} className="p-1.5 hidden sm:inline-flex" title="Edit" style={{ color: 'var(--text-muted)' }}><Edit3 size={14} /></button>
        )}
        <button onClick={onFavorite} className="p-1.5" title="Favorite">
          <Star size={14} fill={file.is_favorite ? 'var(--accent-red)' : 'none'} color={file.is_favorite ? 'var(--accent-red)' : 'var(--text-muted)'} />
        </button>
        <button onClick={onDownload} className="p-1.5 hidden sm:inline-flex" title="Download" style={{ color: 'var(--text-muted)' }}><Download size={14} /></button>

        <div className="relative">
          <button onClick={() => setMenuOpen((p) => !p)} className="p-1.5" title="More" style={{ color: 'var(--text-muted)' }}><MoreVertical size={14} /></button>
          {menuOpen && (
            <div
              className="absolute right-0 top-8 w-40 rounded-lg p-1 z-20 fade-in"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-lg)' }}
              onMouseLeave={() => setMenuOpen(false)}
            >
              <button onClick={() => { onOpen(); setMenuOpen(false); }} className="sm:hidden w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-left hover:bg-black/5"><ExternalLink size={12} />Open</button>
              {isEditable && (
                <button onClick={() => { onEdit(); setMenuOpen(false); }} className="sm:hidden w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-left hover:bg-black/5"><Edit3 size={12} />Edit</button>
              )}
              <button onClick={() => { onRename(); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-left hover:bg-black/5"><Edit3 size={12} />Rename</button>
              <button onClick={() => { onProperties(); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-left hover:bg-black/5"><Info size={12} />Properties</button>
              <button onClick={() => { onDownload(); setMenuOpen(false); }} className="sm:hidden w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-left hover:bg-black/5"><Download size={12} />Download</button>
              <button onClick={() => { onShare(); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-left hover:bg-black/5"><Share2 size={12} />Share</button>
              <div className="my-1" style={{ borderTop: '1px solid var(--border-color)' }} />
              <button onClick={() => { onDelete(); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-left hover:bg-black/5" style={{ color: '#dc2626' }}><Trash2 size={12} />Delete</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* -------- Quick filter button -------- */
function QuickFilterBtn({ icon, label, count, onClick }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2 text-sm px-2 py-1.5 rounded-lg text-left transition-all hover:bg-black/5" style={{ color: 'var(--text-main)' }}>
      <span style={{ color: 'var(--accent-red)' }}>{icon}</span>
      <span className="flex-1">{label}</span>
      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{count}</span>
    </button>
  );
}

/* -------- Search results -------- */
function SearchResultsView({ results, onOpenFolder, onOpenFile }) {
  if (!results) return null;
  if (results.total === 0) return <div className="text-sm py-8 text-center" style={{ color: 'var(--text-muted)' }}>No matches</div>;
  return (
    <div className="space-y-6">
      {results.folders.length > 0 && (
        <Section title={`Folders (${results.folders.length})`}>
          <div className="flex flex-wrap gap-2">
            {results.folders.map((f) => (
              <button key={f.id} onClick={() => onOpenFolder(f)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
                <FolderIcon name={f.icon} size={14} />
                {f.name}
              </button>
            ))}
          </div>
        </Section>
      )}
      {results.pdfs.length > 0 && <FileGroup title={`PDFs (${results.pdfs.length})`} items={results.pdfs} onOpen={onOpenFile} />}
      {results.images.length > 0 && <FileGroup title={`Images (${results.images.length})`} items={results.images} onOpen={onOpenFile} />}
      {results.videos.length > 0 && <FileGroup title={`Videos (${results.videos.length})`} items={results.videos} onOpen={onOpenFile} />}
      {results.audio.length > 0 && <FileGroup title={`Audio (${results.audio.length})`} items={results.audio} onOpen={onOpenFile} />}
      {results.others.length > 0 && <FileGroup title={`Other (${results.others.length})`} items={results.others} onOpen={onOpenFile} />}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <h3 className="text-xs uppercase tracking-wide font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>{title}</h3>
      {children}
    </div>
  );
}
function FileGroup({ title, items, onOpen }) {
  return (
    <Section title={title}>
      <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
        {items.map((f) => (
          <button key={f.id} onClick={() => onOpen(f)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
            <span style={{ color: 'var(--text-muted)' }}>{iconForType(f.content_type, f.name)}</span>
            <span className="truncate flex-1">{f.name}</span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{fmtSize(f.size)}</span>
          </button>
        ))}
      </div>
    </Section>
  );
}

/* -------- Modals -------- */
function ModalShell({ title, children, onClose, maxWidth = 'max-w-lg' }) {
  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-6 fade-in" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div className={`w-full ${maxWidth} rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 slide-up`} style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-lg)', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-heading text-xl sm:text-2xl">{title}</h2>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ConfirmModal({ title, message, confirmLabel = 'Confirm', danger = false, onCancel, onConfirm }) {
  return (
    <ModalShell title={title} onClose={onCancel} maxWidth="max-w-sm">
      <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>{message}</p>
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 py-2.5 rounded-lg text-sm font-medium" style={{ background: 'var(--bg-hover)' }}>Cancel</button>
        <button onClick={onConfirm} className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white" style={{ background: danger ? '#dc2626' : 'var(--accent-red)' }}>{confirmLabel}</button>
      </div>
    </ModalShell>
  );
}

function UploadModal({ onClose, folders, defaultFolder, onUpload }) {
  const [selectedFolder, setSelectedFolder] = useState(defaultFolder || null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const inputRef = useRef();
  return (
    <ModalShell onClose={onClose} title="Upload Files">
      <div className="mb-4">
        <label className="text-xs font-semibold uppercase tracking-wide mb-2 block" style={{ color: 'var(--text-muted)' }}>Destination Folder</label>
        <select
          value={selectedFolder?.id || ''}
          onChange={(e) => setSelectedFolder(folders.find((f) => f.id === e.target.value))}
          className="w-full p-3 rounded-lg text-sm outline-none"
          style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
        >
          <option value="">-- Choose folder --</option>
          {folders.map((f) => {
            const path = []; let cur = f;
            while (cur) { path.unshift(cur.name); cur = folders.find((x) => x.id === cur.parent_id); }
            return <option key={f.id} value={f.id}>{path.join(' › ')}</option>;
          })}
        </select>
      </div>
      <div onClick={() => inputRef.current?.click()} className="rounded-xl p-8 text-center cursor-pointer" style={{ border: '2px dashed var(--border-color)', background: 'var(--bg-main)' }}>
        <Upload size={32} style={{ margin: '0 auto 12px', color: 'var(--accent-red)' }} />
        <p className="font-medium mb-1">Click to select files</p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>PDFs, images, videos, audio, documents</p>
        <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))} />
      </div>
      {selectedFiles.length > 0 && (
        <div className="mt-4 max-h-40 overflow-y-auto">
          {selectedFiles.map((f, i) => (
            <div key={i} className="flex items-center gap-2 py-1.5 text-sm">
              <span style={{ color: 'var(--text-muted)' }}>{iconForType(f.type, f.name)}</span>
              <span className="flex-1 truncate">{f.name}</span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{fmtSize(f.size)}</span>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2 mt-6">
        <button onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm font-medium" style={{ background: 'var(--bg-hover)' }}>Cancel</button>
        <button
          disabled={!selectedFolder || selectedFiles.length === 0}
          onClick={() => onUpload(selectedFiles, selectedFolder)}
          className="flex-1 py-2.5 rounded-lg text-sm font-medium accent-bg text-white disabled:opacity-50"
        >
          Upload {selectedFiles.length > 0 ? `(${selectedFiles.length})` : ''}
        </button>
      </div>
    </ModalShell>
  );
}

function NewFolderModal({ parent, onClose, onCreate }) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('folder');
  return (
    <ModalShell onClose={onClose} title={parent ? `New folder inside "${parent.name}"` : 'New folder'}>
      <label className="text-xs font-semibold uppercase tracking-wide mb-2 block" style={{ color: 'var(--text-muted)' }}>Name</label>
      <input
        autoFocus value={name} onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Physics, Vacation 2026…"
        className="w-full p-3 rounded-lg text-sm outline-none mb-4"
        style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
        onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) onCreate(name, icon); }}
      />
      <label className="text-xs font-semibold uppercase tracking-wide mb-2 block" style={{ color: 'var(--text-muted)' }}>Icon</label>
      <div className="grid grid-cols-8 gap-2 mb-6 max-h-60 overflow-y-auto p-1">
        {ICON_PICKER.map((key) => (
          <button
            key={key}
            onClick={() => setIcon(key)}
            className="w-10 h-10 rounded-lg flex items-center justify-center transition-all"
            style={{
              background: icon === key ? 'var(--accent-soft)' : 'var(--bg-main)',
              color: icon === key ? 'var(--accent-red)' : 'var(--text-muted)',
              border: `1px solid ${icon === key ? 'var(--accent-red)' : 'var(--border-color)'}`,
            }}
          >
            <FolderIcon name={key} size={18} />
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <button onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm font-medium" style={{ background: 'var(--bg-hover)' }}>Cancel</button>
        <button disabled={!name.trim()} onClick={() => onCreate(name, icon)} className="flex-1 py-2.5 rounded-lg text-sm font-medium accent-bg text-white disabled:opacity-50">Create</button>
      </div>
    </ModalShell>
  );
}

function ThemePickerModal({ currentThemeId, isRandom, onClose, onPick }) {
  return (
    <ModalShell onClose={onClose} title="Choose Theme" maxWidth="max-w-xl">
      <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Pick an accent color for VaultX. Saved to your account.</p>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-5">
        {THEME_LIST.map((t) => {
          const isActive = !isRandom && currentThemeId === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onPick(t.id, false)}
              className="p-4 rounded-xl flex flex-col items-center gap-2 transition-all"
              style={{ background: 'var(--bg-main)', border: `2px solid ${isActive ? t.accent : 'var(--border-color)'}` }}
            >
              <div className="w-12 h-12 rounded-full" style={{ background: t.gradient || t.accent, boxShadow: `0 4px 12px ${t.accent}55` }} />
              <div className="text-sm font-medium">{t.name}</div>
              <div className="text-xs capitalize" style={{ color: 'var(--text-muted)' }}>{t.kind}</div>
              {isActive && <div className="text-xs" style={{ color: t.accent }}><Check size={14} className="inline" /> Active</div>}
            </button>
          );
        })}
      </div>
      <button
        onClick={() => onPick(null, true)}
        className="w-full p-4 rounded-xl flex items-center gap-3 transition-all"
        style={{ background: 'var(--bg-main)', border: `2px solid ${isRandom ? 'var(--accent-red)' : 'var(--border-color)'}` }}
      >
        <div className="w-10 h-10 rounded-full" style={{ background: 'conic-gradient(#da5d4b, #3b82f6, #10b981, #f59e0b, #8b5cf6, #ec4899, #14b8a6, #da5d4b)' }} />
        <div className="text-left flex-1">
          <div className="text-sm font-medium">Surprise Me 🎲</div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>New random theme on every refresh</div>
        </div>
        {isRandom && <Check size={16} style={{ color: 'var(--accent-red)' }} />}
      </button>
    </ModalShell>
  );
}

function QuickFilterModal({ type, files, onClose, onOpenFile }) {
  const titles = { favorites: '⭐ Favorites', pdfs: '📄 PDFs', videos: '🎥 Videos', images: '🖼️ Images', audio: '🎵 Audio' };
  return (
    <ModalShell onClose={onClose} title={titles[type] || 'Files'} maxWidth="max-w-3xl">
      {files.length === 0 ? (
        <div className="text-center py-10 text-sm" style={{ color: 'var(--text-muted)' }}>No files match this filter yet.</div>
      ) : (
        <div className="grid gap-2 max-h-[65vh] overflow-y-auto" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
          {files.map((f) => (
            <button key={f.id} onClick={() => onOpenFile(f)} className="flex items-center gap-3 p-3 rounded-lg text-left card-hover" style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)' }}>
              <span style={{ color: 'var(--text-muted)' }}>{iconForType(f.content_type, f.name)}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{f.name}</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{fmtSize(f.size)} • {fmtDate(f.created_at)}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </ModalShell>
  );
}

function MoveModal({ folders, onCancel, onMove }) {
  const [selectedId, setSelectedId] = useState('');
  return (
    <ModalShell onClose={onCancel} title="Move to folder">
      <select
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
        className="w-full p-3 rounded-lg text-sm outline-none mb-4"
        style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
      >
        <option value="">-- Choose destination --</option>
        {folders.map((f) => {
          const path = []; let cur = f;
          while (cur) { path.unshift(cur.name); cur = folders.find((x) => x.id === cur.parent_id); }
          return <option key={f.id} value={f.id}>{path.join(' › ')}</option>;
        })}
      </select>
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 py-2.5 rounded-lg text-sm font-medium" style={{ background: 'var(--bg-hover)' }}>Cancel</button>
        <button disabled={!selectedId} onClick={() => onMove(selectedId)} className="flex-1 py-2.5 rounded-lg text-sm font-medium accent-bg text-white disabled:opacity-50">Move</button>
      </div>
    </ModalShell>
  );
}


function RenameModal({ file, onClose, onRename }) {
  const [name, setName] = useState(file.name);
  return (
    <ModalShell onClose={onClose} title="Rename file" maxWidth="max-w-sm">
      <label className="text-xs font-semibold uppercase tracking-wide mb-2 block" style={{ color: 'var(--text-muted)' }}>New name</label>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full p-3 rounded-lg text-sm outline-none mb-6"
        style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
        onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) onRename(name.trim()); }}
        onFocus={(e) => e.target.select()}
      />
      <div className="flex gap-2">
        <button onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm font-medium" style={{ background: 'var(--bg-hover)' }}>Cancel</button>
        <button disabled={!name.trim()} onClick={() => onRename(name.trim())} className="flex-1 py-2.5 rounded-lg text-sm font-medium accent-bg text-white disabled:opacity-50">Rename</button>
      </div>
    </ModalShell>
  );
}

function PropertiesModal({ file, folders, onClose }) {
  const kind = kindOf(file.content_type, file.name);
  const folder = folders.find((f) => f.id === file.folder_id);
  const path = [];
  let cur = folder;
  while (cur) { path.unshift(cur.name); cur = folders.find((f) => f.id === cur.parent_id); }

  const rows = [
    ['Name', file.name],
    ['Type', kind.toUpperCase()],
    ['Content type', file.content_type || 'unknown'],
    ['Size', fmtSize(file.size)],
    ['Folder', path.join(' › ') || '—'],
    ['Uploaded', fmtDate(file.created_at)],
    ['Favorite', file.is_favorite ? 'Yes ⭐' : 'No'],
  ];
  if (file.file_hash) rows.push(['Hash (SHA-256)', `${file.file_hash.slice(0, 16)}…`]);

  return (
    <ModalShell onClose={onClose} title="File properties" maxWidth="max-w-sm">
      <div className="flex items-center gap-3 mb-5 p-3 rounded-lg" style={{ background: 'var(--bg-main)' }}>
        <span style={{ color: 'var(--text-muted)' }}>{bigIconForType(file.content_type, 28, file.name)}</span>
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate">{file.name}</div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{fmtSize(file.size)}</div>
        </div>
      </div>
      <div className="flex flex-col gap-2.5">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 text-sm">
            <span style={{ color: 'var(--text-muted)' }}>{label}</span>
            <span className="text-right truncate font-medium">{value}</span>
          </div>
        ))}
      </div>
      <button onClick={onClose} className="w-full mt-6 py-2.5 rounded-lg text-sm font-medium" style={{ background: 'var(--bg-hover)' }}>Close</button>
    </ModalShell>
  );
}

function EditFileModal({ file, onClose, onSave }) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.storage.from('vaultx').createSignedUrl(file.storage_path, 300);
      if (!data) { setLoading(false); return; }
      const res = await fetch(data.signedUrl);
      const text = await res.text();
      if (!cancelled) { setContent(text); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [file]);

  const handleSave = async () => {
    setSaving(true);
    await onSave(content);
    setSaving(false);
  };

  return (
    <ModalShell onClose={onClose} title={`Edit — ${file.name}`} maxWidth="max-w-3xl">
      {loading ? (
        <div className="flex justify-center py-16"><div className="spinner" /></div>
      ) : (
        <>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            spellCheck={false}
            className="w-full rounded-lg p-3 text-sm font-mono outline-none mb-4"
            style={{ background: '#111118', color: '#e4e4ed', border: '1px solid var(--border-color)', height: '50vh', resize: 'vertical', lineHeight: 1.6 }}
          />
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm font-medium" style={{ background: 'var(--bg-hover)' }}>Cancel</button>
            <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-lg text-sm font-medium accent-bg text-white disabled:opacity-60">
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </>
      )}
    </ModalShell>
  );
}

function MissingSupabaseConfig() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg-main)' }}>
      <div className="w-full max-w-lg rounded-2xl p-8 glass" style={{ boxShadow: 'var(--shadow-lg)' }}>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 mx-auto accent-bg">
          <Sparkles color="white" size={28} />
        </div>
        <h1 className="text-3xl font-heading text-center mb-3">VaultX setup needed</h1>
        <p className="text-sm text-center mb-6" style={{ color: 'var(--text-muted)' }}>
          Add these Supabase environment variables in Vercel before using the app.
        </p>
        <div className="rounded-xl p-4 text-sm font-mono space-y-2" style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)' }}>
          <div>NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co</div>
          <div>NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE</div>
        </div>
      </div>
    </div>
  );
}

/* ==================== VAULTX TOOL ==================== */
export default function VaultXTool({ session }) {
  return <VaultApp session={session} />;
}

/* Legacy standalone root retained for reference but not exported. */
function App() {
  const [session, setSession] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setChecking(false);
      return undefined;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecking(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!isSupabaseConfigured) return <MissingSupabaseConfig />;

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-main)' }}>
        <div className="spinner" />
      </div>
    );
  }

  return session ? <VaultApp session={session} /> : <LoginScreen />;
}
