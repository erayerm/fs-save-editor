import { FileBar } from './components/FileBar';

export default function App() {
  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-100 p-6 space-y-4">
      <h1 className="text-2xl font-bold">fs-save-editor</h1>
      <FileBar />
    </div>
  );
}
