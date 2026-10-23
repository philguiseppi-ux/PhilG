import { useState } from 'react';
import Dashboard from './pages/Dashboard';
import Catalog from './pages/Catalog';
import Quotes from './pages/Quotes';
import QuoteEditor from './pages/QuoteEditor';
import { FileText, Package, LayoutDashboard } from 'lucide-react';

type Page = 'dashboard' | 'catalog' | 'quotes' | 'quote-editor';

interface NavigationState {
  page: Page;
  quoteId?: string;
}

function App() {
  const [navigation, setNavigation] = useState<NavigationState>({ page: 'dashboard' });

  const navigateTo = (page: Page, quoteId?: string) => {
    setNavigation({ page, quoteId });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex space-x-8">
              <div className="flex items-center">
                <h1 className="text-xl font-bold text-slate-900">Devis Datacenter</h1>
              </div>
              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => navigateTo('dashboard')}
                  className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    navigation.page === 'dashboard'
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4 mr-2" />
                  Dashboard
                </button>
                <button
                  type="button"
                  onClick={() => navigateTo('catalog')}
                  className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    navigation.page === 'catalog'
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Package className="w-4 h-4 mr-2" />
                  Catalogue
                </button>
                <button
                  type="button"
                  onClick={() => navigateTo('quotes')}
                  className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    navigation.page === 'quotes'
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Devis
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {navigation.page === 'dashboard' && <Dashboard onNavigate={navigateTo} />}
        {navigation.page === 'catalog' && <Catalog />}
        {navigation.page === 'quotes' && <Quotes onNavigate={navigateTo} />}
        {navigation.page === 'quote-editor' && (
          <QuoteEditor quoteId={navigation.quoteId} onNavigate={navigateTo} />
        )}
      </main>
    </div>
  );
}

export default App;
