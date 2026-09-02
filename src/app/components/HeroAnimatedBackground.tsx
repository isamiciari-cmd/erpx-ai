import { motion } from 'motion/react';
import { useEffect, useState } from 'react';

export function HeroAnimatedBackground() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (isMobile) return;

    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isMobile]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
      {/* Gradient Orbs */}
      <motion.div
        animate={{
          x: [0, 100, 0],
          y: [0, 50, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        style={{
          x: mousePosition.x,
          y: mousePosition.y,
        }}
        className="absolute top-20 left-20 w-96 h-96 bg-blue-500/20 rounded-full blur-[120px]"
      />

      <motion.div
        animate={{
          x: [0, -80, 0],
          y: [0, 80, 0],
          scale: [1, 1.3, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 2,
        }}
        style={{
          x: -mousePosition.x,
          y: -mousePosition.y,
        }}
        className="absolute bottom-20 right-20 w-96 h-96 bg-cyan-500/20 rounded-full blur-[120px]"
      />

      <motion.div
        animate={{
          x: [0, -60, 0],
          y: [0, -40, 0],
          scale: [1, 1.15, 1],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 4,
        }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[150px]"
      />

      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />

      {/* Animated Grid Lines */}
      <svg className="absolute inset-0 w-full h-full opacity-20">
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
            <stop offset="50%" stopColor="#06b6d4" stopOpacity="1" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
        </defs>

        {!isMobile && (
          <>
            {/* Diagonal Lines */}
            <motion.line
              x1="0"
              y1="100%"
              x2="100%"
              y2="0"
              stroke="url(#lineGradient)"
              strokeWidth="2"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'linear',
              }}
            />

            <motion.line
              x1="0"
              y1="0"
              x2="100%"
              y2="100%"
              stroke="url(#lineGradient)"
              strokeWidth="2"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: 'linear',
                delay: 1,
              }}
            />
          </>
        )}
      </svg>

      {/* Floating Particles */}
      {!isMobile && (
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-cyan-400/40 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -100, 0],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 3 + Math.random() * 4,
                repeat: Infinity,
                delay: Math.random() * 5,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
      )}

      {/* Glowing Rings */}
      <motion.div
        className="absolute top-1/4 left-1/4"
        animate={{
          rotate: 360,
          scale: [1, 1.2, 1],
        }}
        transition={{
          rotate: {
            duration: 20,
            repeat: Infinity,
            ease: 'linear',
          },
          scale: {
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut',
          },
        }}
      >
        <div className="w-64 h-64 border border-blue-500/20 rounded-full blur-sm" />
        <div className="absolute inset-4 w-56 h-56 border border-cyan-500/20 rounded-full blur-sm" />
      </motion.div>

      <motion.div
        className="absolute bottom-1/4 right-1/4"
        animate={{
          rotate: -360,
          scale: [1, 1.3, 1],
        }}
        transition={{
          rotate: {
            duration: 25,
            repeat: Infinity,
            ease: 'linear',
          },
          scale: {
            duration: 5,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 1,
          },
        }}
      >
        <div className="w-80 h-80 border border-purple-500/20 rounded-full blur-sm" />
        <div className="absolute inset-6 w-68 h-68 border border-pink-500/20 rounded-full blur-sm" />
      </motion.div>

      {/* AI Neural Network Nodes */}
      {!isMobile && (
        <svg className="absolute inset-0 w-full h-full opacity-30">
          <g>
            {/* Nodes */}
            {[
              { cx: '20%', cy: '30%' },
              { cx: '40%', cy: '20%' },
              { cx: '60%', cy: '40%' },
              { cx: '80%', cy: '25%' },
              { cx: '30%', cy: '70%' },
              { cx: '70%', cy: '80%' },
            ].map((node, i) => (
              <motion.circle
                key={i}
                cx={node.cx}
                cy={node.cy}
                r="4"
                fill="#3b82f6"
                initial={{ opacity: 0.3 }}
                animate={{
                  opacity: [0.3, 0.8, 0.3],
                  r: [4, 6, 4],
                }}
                transition={{
                  duration: 2 + i * 0.3,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            ))}

            {/* Connection Lines */}
            <motion.line
              x1="20%"
              y1="30%"
              x2="40%"
              y2="20%"
              stroke="#3b82f6"
              strokeWidth="1"
              strokeOpacity="0.3"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: [0, 1, 0] }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />

            <motion.line
              x1="40%"
              y1="20%"
              x2="60%"
              y2="40%"
              stroke="#06b6d4"
              strokeWidth="1"
              strokeOpacity="0.3"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: [0, 1, 0] }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: 0.5,
              }}
            />

            <motion.line
              x1="60%"
              y1="40%"
              x2="80%"
              y2="25%"
              stroke="#3b82f6"
              strokeWidth="1"
              strokeOpacity="0.3"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: [0, 1, 0] }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: 1,
              }}
            />

            <motion.line
              x1="20%"
              y1="30%"
              x2="30%"
              y2="70%"
              stroke="#a855f7"
              strokeWidth="1"
              strokeOpacity="0.3"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: [0, 1, 0] }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: 1.5,
              }}
            />

            <motion.line
              x1="60%"
              y1="40%"
              x2="70%"
              y2="80%"
              stroke="#06b6d4"
              strokeWidth="1"
              strokeOpacity="0.3"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: [0, 1, 0] }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: 2,
              }}
            />
          </g>
        </svg>
      )}

      {/* Floating Dashboard Cards */}
      {!isMobile && (
        <>
          <motion.div
            className="absolute top-1/4 right-1/4 w-48 h-32 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 backdrop-blur-sm border border-blue-500/20 rounded-xl"
            animate={{
              y: [0, -20, 0],
              rotate: [0, 5, 0],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{
              x: mousePosition.x * 0.5,
              y: mousePosition.y * 0.5,
            }}
          />

          <motion.div
            className="absolute bottom-1/3 left-1/4 w-40 h-28 bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-sm border border-purple-500/20 rounded-xl"
            animate={{
              y: [0, 20, 0],
              rotate: [0, -5, 0],
            }}
            transition={{
              duration: 7,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 1,
            }}
            style={{
              x: -mousePosition.x * 0.3,
              y: -mousePosition.y * 0.3,
            }}
          />
        </>
      )}

      {/* Holographic Waves */}
      <div className="absolute bottom-0 left-0 right-0 h-1/2 opacity-20">
        <svg className="w-full h-full" viewBox="0 0 1200 400" preserveAspectRatio="none">
          <motion.path
            d="M0,200 Q300,100 600,200 T1200,200 L1200,400 L0,400 Z"
            fill="url(#waveGradient1)"
            initial={{ d: 'M0,200 Q300,100 600,200 T1200,200 L1200,400 L0,400 Z' }}
            animate={{
              d: [
                'M0,200 Q300,100 600,200 T1200,200 L1200,400 L0,400 Z',
                'M0,200 Q300,250 600,200 T1200,200 L1200,400 L0,400 Z',
                'M0,200 Q300,100 600,200 T1200,200 L1200,400 L0,400 Z',
              ],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />

          <motion.path
            d="M0,250 Q300,150 600,250 T1200,250 L1200,400 L0,400 Z"
            fill="url(#waveGradient2)"
            initial={{ d: 'M0,250 Q300,150 600,250 T1200,250 L1200,400 L0,400 Z' }}
            animate={{
              d: [
                'M0,250 Q300,150 600,250 T1200,250 L1200,400 L0,400 Z',
                'M0,250 Q300,300 600,250 T1200,250 L1200,400 L0,400 Z',
                'M0,250 Q300,150 600,250 T1200,250 L1200,400 L0,400 Z',
              ],
            }}
            transition={{
              duration: 12,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 1,
            }}
          />

          <defs>
            <linearGradient id="waveGradient1" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="waveGradient2" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Data Flow Lines */}
      {!isMobile && (
        <svg className="absolute inset-0 w-full h-full opacity-20">
          <defs>
            <linearGradient id="flowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
              <stop offset="50%" stopColor="#06b6d4" stopOpacity="1" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>
          </defs>

          <motion.path
            d="M100,100 Q300,50 500,100 T900,100"
            stroke="url(#flowGradient)"
            strokeWidth="2"
            fill="none"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{
              pathLength: [0, 1],
              opacity: [0, 1, 1, 0],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: 'linear',
            }}
          />

          <motion.path
            d="M200,300 Q400,250 600,300 T1000,300"
            stroke="url(#flowGradient)"
            strokeWidth="2"
            fill="none"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{
              pathLength: [0, 1],
              opacity: [0, 1, 1, 0],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: 'linear',
              delay: 2,
            }}
          />
        </svg>
      )}

      {/* Dark Overlay for Readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60" />
    </div>
  );
}
