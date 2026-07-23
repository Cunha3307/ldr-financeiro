import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LDR Financeiro - Gestão Financeira',
  description: 'Sistema de gestão financeira da Comunidade Lugar de Refúgio',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="bg-slate-100 text-slate-900 min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
