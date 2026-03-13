import type { GameMode } from '../types';
import Header from '../components/Header';

interface GameModeSelectProps {
  onSelect: (mode: GameMode) => void;
  onBack?: () => void;
}

export default function GameModeSelect({ onSelect, onBack }: GameModeSelectProps) {
  return (
    <>
      <Header onBack={onBack} showBackButton={!!onBack} />
      <h1>Selecciona el Modo de Juego</h1>
      <div className="button-group">
        <button className="primary" onClick={() => onSelect('save')}>
          💚 Salvar Canción
        </button>
        <button className="primary" onClick={() => onSelect('eliminate')}>
          ❌ Eliminar Canción
        </button>
      </div>
    </>
  );
}
