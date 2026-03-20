import { useEffect, useState } from 'react';

interface WaitingForRoundProps {
  roundNumber: number;
  totalRounds: number;
}

export default function WaitingForRound({ roundNumber, totalRounds }: WaitingForRoundProps) {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => (prev.length < 3 ? prev + '.' : ''));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-purple-900 flex items-center justify-center p-4">
      <div className="text-center">
        {/* Título */}
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          Espera un Momento
        </h1>

        {/* Descripción */}
        <p className="text-xl md:text-2xl text-purple-200 mb-8">
          Te reconectaste durante esta ronda
        </p>

        {/* Mensaje de espera */}
        <div className="bg-purple-800 bg-opacity-50 rounded-lg p-8 mb-12 max-w-md mx-auto border-2 border-purple-400">
          <p className="text-lg text-white mb-2">
            Esperando a la siguiente ronda{dots}
          </p>
          <p className="text-purple-200">
            Ronda {roundNumber} de {totalRounds}
          </p>
        </div>

        {/* Información adicional */}
        <div className="text-purple-300">
          <p className="mb-2">Los otros jugadores están votando</p>
          <p>Pronto podrás jugar en la siguiente ronda</p>
        </div>

        {/* Animación */}
        <div className="mt-12 flex justify-center gap-2">
          <div className="w-3 h-3 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
          <div className="w-3 h-3 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-3 h-3 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
        </div>
      </div>
    </div>
  );
}
