import ImportButton from './ImportButton';

interface HeaderProps {
  onBookImported: () => void;
}

export default function Header({ onBookImported }: HeaderProps) {
  return (
    <header className="flex justify-between items-center mb-8 pb-4 border-b">
      <h1 className="text-3xl font-bold">Final Reader</h1>
      <ImportButton onBookImported={onBookImported} />
    </header>
  );
}
