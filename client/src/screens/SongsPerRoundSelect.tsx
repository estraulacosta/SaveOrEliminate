interface SongsPerRoundSelectProps {
  onSelect: (count: number) => void;
  onBack?: () => void;
}
import Header from '../components/Header';

export default function SongsPerRoundSelect({ onSelect, onBack }: SongsPerRoundSelectProps) {
  const options = [2, 3, 4, 5, 6];

  return (
    <>
      <Header onBack={onBack} showBackButton={!!onBack} />
      <h1>¿Cuántas canciones por ronda?</h1>
      <div className="button-group">
        {options.map(num => (
          <button key={num} onClick={() => onSelect(num)}>
            {num} canciones
          </button>
        ))}
      </div>
    </>
  );
}
