import { FileBar } from './components/FileBar';
import { DwellerList } from './components/DwellerList';
import { DwellerDetailPanel } from './components/DwellerDetailPanel';

export default function App() {
  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-100 p-6 space-y-4">
      <h1 className="text-2xl font-bold">fs-save-editor</h1>
      <FileBar />
      <div className="grid grid-cols-[300px_1fr] gap-4">
        <DwellerList />
        <div className="border border-zinc-700 rounded p-4">
          <DwellerDetailPanel />
        </div>
      </div>
    </div>
  );
}
