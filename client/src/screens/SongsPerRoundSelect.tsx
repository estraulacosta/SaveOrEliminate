interface SongsPerRoundSelectProps {
  onSelect: (count: number) => void;
}

export default function SongsPerRoundSelect({ onSelect }: SongsPerRoundSelectProps) {
  const options = [2, 3, 4, 5, 6];

  return (
    <>
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
