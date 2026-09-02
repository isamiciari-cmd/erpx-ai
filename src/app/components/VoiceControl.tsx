import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import { useNavigate } from 'react-router';

export default function VoiceControl() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if browser supports Web Speech API
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      setIsSupported(true);
    }
  }, []);

  const startListening = () => {
    if (!isSupported) {
      alert('Voice control is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    const SpeechRecognition =
      (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const command = event.results[0][0].transcript.toLowerCase();
      setTranscript(command);
      processCommand(command);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const processCommand = (command: string) => {
    // Navigation commands
    if (command.includes('dashboard') || command.includes('home')) {
      navigate('/');
    } else if (command.includes('finance') || command.includes('accounting')) {
      navigate('/finance/accounting');
    } else if (command.includes('invoice')) {
      navigate('/finance/invoicing');
    } else if (command.includes('orders')) {
      navigate('/crm');
    } else if (command.includes('inventory')) {
      navigate('/inventory');
    } else if (command.includes('zatca')) {
      navigate('/finance/zatca');
    } else if (command.includes('tenant')) {
      navigate('/admin/tenants');
    } else {
      // Speak back unrecognized command
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(
          'Command not recognized. Try saying dashboard, finance, orders, or inventory.',
        );
        window.speechSynthesis.speak(utterance);
      }
    }
  };

  if (!isSupported) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed bottom-8 right-8 z-50"
    >
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={startListening}
        disabled={isListening}
        className={`w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all ${
          isListening
            ? 'bg-gradient-to-r from-red-500 to-rose-500 animate-pulse'
            : 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:shadow-blue-500/50'
        }`}
      >
        {isListening ? (
          <MicOff className="w-7 h-7 text-white" />
        ) : (
          <Mic className="w-7 h-7 text-white" />
        )}
      </motion.button>

      {/* Transcript Display */}
      {transcript && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="absolute bottom-20 right-0 bg-gray-900 border border-white/10 rounded-xl p-3 shadow-xl min-w-[200px]"
        >
          <div className="flex items-center gap-2 mb-1">
            <Volume2 className="w-4 h-4 text-blue-400" />
            <p className="text-xs text-gray-400">You said:</p>
          </div>
          <p className="text-sm text-white">{transcript}</p>
        </motion.div>
      )}

      {/* Listening Indicator */}
      {isListening && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute -inset-4 rounded-full bg-blue-500/20 blur-xl"
        />
      )}
    </motion.div>
  );
}
