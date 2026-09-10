import { Activity, BarChart3, Boxes, ClipboardList, FolderTree, Gauge, Image, LayoutDashboard, Settings, Shirt, Tag, Users } from 'lucide-react';
export const NAVIGATION = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'products', label: 'Productos', icon: Shirt },
  { id: 'categories', label: 'Categorías', icon: FolderTree },
  { id: 'collections', label: 'Colecciones', icon: Tag },
  { id: 'inventory', label: 'Inventario', icon: Boxes },
  { id: 'orders', label: 'Pedidos', icon: ClipboardList },
  { id: 'banners', label: 'Banners', icon: Image },
  { id: 'size-guides', label: 'Guía de talles', icon: Gauge },
  { id: 'settings', label: 'Configuración', icon: Settings },
  { id: 'admins', label: 'Usuarios admin', icon: Users },
  { id: 'activity', label: 'Actividad', icon: Activity },
  { id: 'reports', label: 'Estadísticas', icon: BarChart3 },
];
