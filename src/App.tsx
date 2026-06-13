import { Analytics } from '@vercel/analytics/react';
import { useSaveStore } from './store/saveStore';
import { ImportLanding } from './components/ImportLanding';
import { Header } from './components/Header';
import { DwellerDetailPanel } from './components/DwellerDetailPanel';
import { CharacterFooter } from './components/CharacterFooter';
import { VaultSettings } from './components/VaultSettings';
import { MobileGate, useIsMobile } from './components/MobileGate';

export default function App() {
  const save = useSaveStore((s) => s.save);
  const page = useSaveStore((s) => s.page);
  const isMobile = useIsMobile();
  if (isMobile) return <MobileGate />;
  if (!save) return <ImportLanding />;
  return (
    <div className="h-screen flex flex-col bg-zinc-900 text-zinc-100">
      <Header />
      <main className="flex-1 min-h-0 overflow-hidden p-4">
        {page === 'vault' ? <VaultSettings /> : <DwellerDetailPanel />}
      </main>
      {page === 'dweller' && <CharacterFooter />}
      <Analytics />
    </div>
  );
}
