// Custom icon pack for folder icons - uses lucide-react
import {
  Brain, BookOpen, Calculator, Globe, Lightbulb, FlaskConical,
  Briefcase, Star, Target, Palette, Music, Video, Image as ImageIcon,
  FileText, Folder, Archive, Bookmark, Award, Heart, Zap, Rocket,
  Coffee, Camera, Code, Compass, Feather, GraduationCap, Library,
  MapPin, Layers, Flame, Trophy, Puzzle, Newspaper, Landmark, Pencil,
  Atom, PieChart, TrendingUp, ScrollText, MessagesSquare, Languages,
} from 'lucide-react';

export const ICON_MAP = {
  folder: Folder,
  brain: Brain,
  'book-open': BookOpen,
  calculator: Calculator,
  globe: Globe,
  lightbulb: Lightbulb,
  flask: FlaskConical,
  briefcase: Briefcase,
  star: Star,
  target: Target,
  palette: Palette,
  music: Music,
  video: Video,
  image: ImageIcon,
  'file-text': FileText,
  archive: Archive,
  bookmark: Bookmark,
  award: Award,
  heart: Heart,
  zap: Zap,
  rocket: Rocket,
  coffee: Coffee,
  camera: Camera,
  code: Code,
  compass: Compass,
  feather: Feather,
  'graduation-cap': GraduationCap,
  library: Library,
  'map-pin': MapPin,
  layers: Layers,
  flame: Flame,
  trophy: Trophy,
  puzzle: Puzzle,
  newspaper: Newspaper,
  landmark: Landmark,
  pencil: Pencil,
  atom: Atom,
  'pie-chart': PieChart,
  'trending-up': TrendingUp,
  scroll: ScrollText,
  chat: MessagesSquare,
  languages: Languages,
};

// Curated grid shown in the icon picker
export const ICON_PICKER = [
  'folder', 'brain', 'book-open', 'calculator', 'globe', 'lightbulb',
  'flask', 'briefcase', 'star', 'target', 'palette', 'music',
  'video', 'image', 'file-text', 'archive', 'bookmark', 'award',
  'heart', 'zap', 'rocket', 'coffee', 'camera', 'code',
  'compass', 'feather', 'graduation-cap', 'library', 'map-pin', 'layers',
  'flame', 'trophy', 'puzzle', 'newspaper', 'landmark', 'pencil',
  'atom', 'pie-chart', 'trending-up', 'scroll', 'chat', 'languages',
];

export function FolderIcon({ name, size = 18, className = '', color }) {
  const key = name && ICON_MAP[name] ? name : 'folder';
  const Comp = ICON_MAP[key];
  return <Comp size={size} className={className} color={color} />;
}
