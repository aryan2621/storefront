import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { AppRoutes } from './routes';
import { AuthProvider } from './lib/session';

const queryClient = new QueryClient();

export const App: React.FC = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
    <BrowserRouter>
      <div className="flex min-h-screen flex-col bg-[var(--color-surface-0)] text-[var(--color-foreground)]">
        <Navbar />
        <main className="flex-1">
          <AppRoutes />
        </main>
        <Footer />
      </div>
    </BrowserRouter>
    </AuthProvider>
  </QueryClientProvider>
);
