import { useSaveStore } from './store/saveStore';
import { ImportLanding } from './components/ImportLanding';
import { Header } from './components/Header';
import { DwellerDetailPanel } from './components/DwellerDetailPanel';
import { CharacterFooter } from './components/CharacterFooter';
import { VaultSettings } from './components/VaultSettings';

export default function App() {
  const save = useSaveStore((s) => s.save);
  const selectedDwellerId = useSaveStore((s) => s.selectedDwellerId);
  if (!save) return <ImportLanding />;
  return (
    <div className="h-screen flex flex-col bg-zinc-900 text-zinc-100">
      <Header />
      <main className="flex-1 overflow-auto p-4">
        {selectedDwellerId === null ? <VaultSettings /> : <DwellerDetailPanel />}
      </main>
      <CharacterFooter />
    </div>
  );
}
