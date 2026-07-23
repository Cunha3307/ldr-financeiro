'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  Receipt, 
  Calculator, 
  BarChart3, 
  LogOut 
} from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const navItems = [
    { name: 'Lançamentos', href: '/lancamentos', icon: Receipt },
    { name: 'Fechamento', href: '/fechamento', icon: Calculator },
    { name: 'Relatório', href: '/relatorio', icon: BarChart3 },
  ];

  return (
    <header className="bg-slate-900 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo / Título */}
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 p-2 rounded-lg font-bold text-xl tracking-wider">
              LDR
            </div>
            <span className="font-semibold text-lg hidden sm:inline">
              Financeiro
            </span>
          </div>

          {/* Menu de Navegação */}
          <nav className="flex items-center space-x-1 sm:space-x-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden md:inline">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Botão Sair */}
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 text-slate-300 hover:text-red-400 hover:bg-slate-800 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            title="Sair"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sair</span>
          </button>

        </div>
      </div>
    </header>
  );
}
