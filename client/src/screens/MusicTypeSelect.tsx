import type { MusicSelectionType } from '../types';
import Header from '../components/Header';

interface MusicTypeSelectProps {
  onSelect: (type: MusicSelectionType) => void;
  onBack?: () => void;
}

export default function MusicTypeSelect({ onSelect, onBack }: MusicTypeSelectProps) {
  return (
    <>
      <Header onBack={onBack} showBackButton={!!onBack} />
      <h1>¿Cómo quieres elegir la música?</h1>
      <div className="button-group">
        <button onClick={() => onSelect('genre')}>🎸 Por Género</button>
        <button onClick={() => onSelect('artist')}>🎤 Por Artista</button>
        <button onClick={() => onSelect('year')}>📅 Por Año</button>
        <button onClick={() => onSelect('decade')}>🕐 Por Década</button>
        <button onClick={() => onSelect('versus')}>⚔️ Versus</button>
      </div>
    </>
  );
}
