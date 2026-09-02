import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
// Use a string path for the background image to avoid TypeScript module resolution
// issues with importing .jpg files. Ensure the imag
// e is placed in the public
// folder at /imports/... so it can be served statically.
const cosmicBg =
  '/imports/cosmic-background-with-colorful-laser-lights-perfect-digital-wallpaper.jpg';

export function HeroCyberpunkBackground() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isMobile) {
        const x = (e.clientX / window.innerWidth - 0.5) * 20;
        const y = (e.clientY / window.innerHeight - 0.5) * 20;
        setMousePosition({ x, y });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isMobile]);

  // Generate particles
  const particles = Array.from({ length: isMobile ? 15 : 30 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 1,
    duration: Math.random() * 10 + 15,
    delay: Math.random() * 5,
  }));

  // Generate neon streaks
  const neonStreaks = Array.from({ length: isMobile ? 3 : 6 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    angle: Math.random() * 360,
    color: i % 2 === 0 ? '#3b82f6' : '#f97316',
    duration: Math.random() * 8 + 6,
    delay: Math.random() * 3,
  }));

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden">
      {/* Background Image with Zoom Animation */}
      <motion.div
        className="absolute inset-0 w-full h-full"
        style={{
          backgroundImage: `url(${cosmicBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          x: mousePosition.x,
          y: mousePosition.y,
        }}
        animate={{
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Dark Navy Overlay */}
      <div
        className="absolute inset-0 w-full h-full"
        style={{
          background: 'rgba(2, 6, 23, 0.72)',
        }}
      />

      {/* Radial Gradient Glow in Center */}
      <div
        className="absolute inset-0 w-full h-full"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(59, 130, 246, 0.15) 0%, transparent 50%)',
        }}
      />

      {/* Animated Glow Pulse - Blue */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[120px] pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, transparent 70%)',
        }}
        animate={{
          opacity: [0.3, 0.6, 0.3],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Animated Glow Pulse - Orange */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[100px] pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(249, 115, 22, 0.2) 0%, transparent 70%)',
        }}
        animate={{
          opacity: [0.2, 0.5, 0.2],
          scale: [1.2, 1, 1.2],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 0.5,
        }}
      />

      {/* Animated Transparent Grid Lines */}
      <svg
        className="absolute inset-0 w-full h-full opacity-20 pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <motion.path
              d="M 60 0 L 0 0 0 60"
              fill="none"
              stroke="rgba(59, 130, 246, 0.3)"
              strokeWidth="0.5"
              animate={{
                strokeOpacity: [0.1, 0.3, 0.1],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* Diagonal Grid Lines */}
      <svg
        className="absolute inset-0 w-full h-full opacity-10 pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.line
            key={`diag-${i}`}
            x1={i * 100}
            y1="0"
            x2={i * 100 + 1000}
            y2="100%"
            stroke="rgba(59, 130, 246, 0.2)"
            strokeWidth="0.5"
            animate={{
              strokeOpacity: [0.05, 0.2, 0.05],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.1,
            }}
          />
        ))}
      </svg>

      {/* Floating Particles */}
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full bg-blue-400/60 backdrop-blur-sm pointer-events-none"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
          }}
          animate={{
            y: [0, -100, 0],
            x: [0, Math.random() * 50 - 25, 0],
            opacity: [0, 0.8, 0],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            delay: particle.delay,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Moving Neon Light Streaks */}
      {neonStreaks.map((streak) => (
        <motion.div
          key={streak.id}
          className="absolute w-1 h-32 rounded-full blur-sm pointer-events-none"
          style={{
            left: `${streak.x}%`,
            top: '-10%',
            background: `linear-gradient(to bottom, transparent, ${streak.color}, transparent)`,
            transform: `rotate(${streak.angle}deg)`,
          }}
          animate={{
            y: ['0vh', '120vh'],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: streak.duration,
            repeat: Infinity,
            delay: streak.delay,
            ease: 'linear',
          }}
        />
      ))}

      {/* Data Flow Lines - Horizontal */}
      <svg
        className="absolute inset-0 w-full h-full opacity-30 pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="dataFlowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(59, 130, 246, 0)" />
            <stop offset="50%" stopColor="rgba(59, 130, 246, 0.8)" />
            <stop offset="100%" stopColor="rgba(59, 130, 246, 0)" />
          </linearGradient>
        </defs>
        {Array.from({ length: 5 }).map((_, i) => (
          <motion.line
            key={`flow-${i}`}
            x1="0"
            y1={`${20 + i * 20}%`}
            x2="100%"
            y2={`${20 + i * 20}%`}
            stroke="url(#dataFlowGradient)"
            strokeWidth="1"
            animate={{
              strokeDashoffset: [0, -1000],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: 'linear',
              delay: i * 0.5,
            }}
            strokeDasharray="100 200"
          />
        ))}
      </svg>

      {/* Corner Accent Lines */}
      <div className="absolute top-0 left-0 w-32 h-32 border-t-2 border-l-2 border-blue-500/30 pointer-events-none" />
      <div className="absolute top-0 right-0 w-32 h-32 border-t-2 border-r-2 border-cyan-500/30 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-32 h-32 border-b-2 border-l-2 border-orange-500/30 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-32 h-32 border-b-2 border-r-2 border-blue-500/30 pointer-events-none" />

      {/* Scanline Effect */}
      <motion.div
        className="absolute inset-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent pointer-events-none"
        animate={{
          y: ['0%', '100%'],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
    </div>
  );
}
