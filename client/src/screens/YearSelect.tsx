import { useState } from 'react';

interface YearSelectProps {
  onSelect: (yearRange: { start: number; end: number }) => void;
}

export default function YearSelect({ onSelect }: YearSelectProps) {
  const currentYear = new Date().getFullYear();
  const minYear = 1960;
  const years = Array.from({ length: currentYear - minYear + 1 }, (_, i) => currentYear - i);
  const [startYear, setStartYear] = useState(2000);
  const [endYear, setEndYear] = useState(currentYear);

  const handleSubmit = () => {
    if (startYear <= endYear) {
      onSelect({ start: startYear, end: endYear });
    } else {
      alert('El año inicial debe ser menor o igual al año final');
    }
  };

  return (
    <>
      <h1>Selecciona el Rango de Años</h1>
      <div style={{ maxWidth: '500px', margin: '0 auto' }}>
        <label style={{ display: 'block', marginBottom: '10px' }}>
          Año Inicial:
          <select
            value={startYear}
            onChange={(e) => setStartYear(parseInt(e.target.value))}
            style={{ width: '100%', marginTop: '8px', padding: '10px', borderRadius: '8px' }}
          >
            {years.slice().reverse().map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: 'block', marginBottom: '20px' }}>
          Año Final:
          <select
            value={endYear}
            onChange={(e) => setEndYear(parseInt(e.target.value))}
            style={{ width: '100%', marginTop: '8px', padding: '10px', borderRadius: '8px' }}
          >
            {years.slice().reverse().map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>
        <p style={{ textAlign: 'center', marginBottom: '20px' }}>
          {endYear - startYear + 1} años = {endYear - startYear + 1} rondas
        </p>
        <button className="primary" onClick={handleSubmit}>
          Confirmar
        </button>
      </div>
    </>
  );
}
