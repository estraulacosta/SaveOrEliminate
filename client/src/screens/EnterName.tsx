import { useState } from 'react';
import Header from '../components/Header';

interface EnterNameProps {
  onSubmit: (name: string) => void;
  onBack?: () => void;
}

export default function EnterName({ onSubmit, onBack }: EnterNameProps) {
  const [name, setName] = useState('');

  return (
    <>
      <Header onBack={onBack} showBackButton={!!onBack} />
      <h1>¿Cuál es tu nombre?</h1>
      <div style={{ maxWidth: '500px', margin: '0 auto' }}>
        <input
          type="text"
          placeholder="Tu nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={20}
          autoFocus
        />
        <button
          className="primary"
          onClick={() => onSubmit(name)}
          disabled={name.trim().length === 0}
        >
          Continuar
        </button>
      </div>
    </>
  );
}
