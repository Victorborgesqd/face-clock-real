import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Package, TrendingUp, LogOut, Clock, Store } from 'lucide-react';

interface StoreLayoutProps {
  children: React.ReactNode;
}

const StoreLayout: React.FC<StoreLayoutProps> = ({ children }) => {
  const location = useLocation();
  const { isAdmin, signOut } = useAuth();

  const navItems = [
    { path: '/loja', icon: ShoppingCart, label: 'PDV', show: true },
    { path: '/loja/produtos', icon: Package, label: 'Produtos', show: isAdmin },
    { path: '/loja/vendas', icon: TrendingUp, label: 'Vendas', show: isAdmin },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Store className="w-6 h-6 text-primary" />
          <span className="font-bold text-foreground">Chão de Giz</span>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/">
            <Button variant="outline" size="sm" className="gap-2">
              <Clock className="w-4 h-4" />
              <span className="hidden sm:inline">Ponto</span>
            </Button>
          </Link>
          <Button variant="ghost" size="icon" onClick={signOut}>
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-card border-t border-border px-2 py-2 flex justify-around items-center sticky bottom-0 z-50 safe-area-inset-bottom">
        {navItems.filter(item => item.show).map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 px-3 py-1 rounded-lg transition-colors ${
                isActive
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-xs">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default StoreLayout;
