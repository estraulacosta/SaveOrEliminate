import type { GameMode } from '../types';

interface GameModeSelectProps {
  onSelect: (mode: GameMode) => void;
}

export default function GameModeSelect({ onSelect }: GameModeSelectProps) {
  return (
    <>
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
