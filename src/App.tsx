import { useSaveStore } from './store/saveStore';
import { ImportLanding } from './components/ImportLanding';
import { Header } from './components/Header';
import { DwellerDetailPanel } from './components/DwellerDetailPanel';

export default function App() {
  const save = useSaveStore((s) => s.save);
  if (!save) return <ImportLanding />;
  return (
    <div className="h-screen flex flex-col bg-zinc-900 text-zinc-100">
      <Header />
      <main className="flex-1 overflow-auto p-4">
        <DwellerDetailPanel />
      </main>
      {/* CharacterFooter added in a later task */}
      <div className="shrink-0 h-2" />
    </div>
  );
}
