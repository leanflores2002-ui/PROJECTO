import { Bell, BarChart3, LayoutDashboard, Shirt, Users } from 'lucide-react';
export const NAVIGATION = [
  { id: 'dashboard', label: 'Panel', description: 'Tu tienda, de un vistazo', icon: LayoutDashboard },
  { id: 'products', label: 'Productos', description: 'Fotos, precios y catálogo', icon: Shirt },
  { id: 'analytics', label: 'Análisis', description: 'Visitas e interés en productos', icon: BarChart3 },
  { id: 'users', label: 'Usuarios', description: 'Accesos de tu equipo', icon: Users },
  { id: 'notifications', label: 'Notificaciones', description: 'Historial de cambios', icon: Bell },
];
