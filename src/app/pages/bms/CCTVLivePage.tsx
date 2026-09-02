import { useState } from 'react';
import { motion } from 'motion/react';
import {
  Camera,
  Maximize2,
  Play,
  Pause,
  Volume2,
  VolumeX,
  AlertTriangle,
  CheckCircle,
  Zap,
  Download,
  Settings,
  Activity,
  Monitor,
} from 'lucide-react';

// Sample Camera Data
const cameras = [
  {
    id: 1,
    name: 'Main Entrance',
    location: 'Floor 1 - Gate A',
    status: 'online',
    recording: true,
    motion: false,
    type: 'entrance',
  },
  {
    id: 2,
    name: 'Parking Lot',
    location: 'Basement - Zone B',
    status: 'online',
    recording: true,
    motion: true,
    type: 'parking',
  },
  {
    id: 3,
    name: 'Office Floor 2',
    location: 'Floor 2 - Office Area',
    status: 'online',
    recording: true,
    motion: false,
    type: 'office',
  },
  {
    id: 4,
    name: 'Back Door',
    location: 'Floor 1 - Service Entry',
    status: 'offline',
    recording: false,
    motion: false,
    type: 'entrance',
  },
  {
    id: 5,
    name: 'Lobby',
    location: 'Floor 1 - Main Lobby',
    status: 'online',
    recording: true,
    motion: true,
    type: 'lobby',
  },
  {
    id: 6,
    name: 'Server Room',
    location: 'Floor 3 - IT Department',
    status: 'online',
    recording: true,
    motion: false,
    type: 'critical',
  },
  {
    id: 7,
    name: 'Warehouse',
    location: 'Building B - Storage',
    status: 'online',
    recording: true,
    motion: false,
    type: 'warehouse',
  },
  {
    id: 8,
    name: 'Emergency Exit',
    location: 'Floor 2 - East Wing',
    status: 'online',
    recording: true,
    motion: false,
    type: 'exit',
  },
  {
    id: 9,
    name: 'Conference Room',
    location: 'Floor 3 - Room 301',
    status: 'online',
    recording: false,
    motion: false,
    type: 'office',
  },
];

const recentEvents = [
  {
    id: 1,
    camera: 'Parking Lot',
    event: 'Motion Detected',
    time: '2m ago',
    severity: 'medium',
    type: 'motion',
  },
  {
    id: 2,
    camera: 'Lobby',
    event: 'Person Detected',
    time: '5m ago',
    severity: 'low',
    type: 'person',
  },
  {
    id: 3,
    camera: 'Back Door',
    event: 'Camera Offline',
    time: '12m ago',
    severity: 'high',
    type: 'offline',
  },
  {
    id: 4,
    camera: 'Main Entrance',
    event: 'Vehicle Detected',
    time: '18m ago',
    severity: 'low',
    type: 'vehicle',
  },
];

export default function CCTVLivePage() {
  const [gridLayout, setGridLayout] = useState<'2x2' | '3x3' | '4x4'>('2x2');
  const [selectedCamera, setSelectedCamera] = useState<number | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [stats, setStats] = useState({
    total: 9,
    online: 8,
    recording: 7,
    alerts: 3,
  });

  const gridCols = {
    '2x2': 'grid-cols-2',
    '3x3': 'grid-cols-3',
    '4x4': 'grid-cols-4',
  };

  const camerasToShow = {
    '2x2': 4,
    '3x3': 9,
    '4x4': 16,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold text-white tracking-tight flex items-center gap-3">
            <Camera className="w-10 h-10 text-blue-400" />
            CCTV Live Monitoring
          </h1>
          <p className="text-gray-400 text-sm font-medium mt-2">
            Real-time surveillance across all locations
          </p>
        </div>

        {/* Grid Layout Selector */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-gray-800/50 border border-gray-700/50 rounded-xl p-1">
            {(['2x2', '3x3', '4x4'] as const).map((layout) => (
              <motion.button
                key={layout}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setGridLayout(layout)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  gridLayout === layout
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                {layout}
              </motion.button>
            ))}
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-4 py-2.5 bg-gray-800/50 border border-gray-700/50 rounded-xl text-sm text-white font-semibold hover:bg-gray-800/70 transition-all flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Settings
          </motion.button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Camera} label="Total Cameras" value={stats.total.toString()} color="blue" />
        <StatCard icon={CheckCircle} label="Online" value={stats.online.toString()} color="green" />
        <StatCard
          icon={Activity}
          label="Recording"
          value={stats.recording.toString()}
          color="purple"
        />
        <StatCard
          icon={AlertTriangle}
          label="Active Alerts"
          value={stats.alerts.toString()}
          color="red"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Camera Grid */}
        <div className="xl:col-span-3">
          <div className={`grid ${gridCols[gridLayout]} gap-4`}>
            {cameras.slice(0, camerasToShow[gridLayout]).map((camera, index) => (
              <CameraFeed
                key={camera.id}
                camera={camera}
                isSelected={selectedCamera === camera.id}
                onSelect={() => setSelectedCamera(camera.id === selectedCamera ? null : camera.id)}
              />
            ))}
          </div>
        </div>

        {/* Right Sidebar - Events & Controls */}
        <div className="space-y-6">
          {/* Recent Events */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Recent Events</h3>
                <p className="text-xs text-gray-400">Live activity feed</p>
              </div>
            </div>

            <div className="space-y-3">
              {recentEvents.map((event) => (
                <motion.div
                  key={event.id}
                  whileHover={{ scale: 1.02, x: 4 }}
                  className={`p-4 rounded-2xl border cursor-pointer ${
                    event.severity === 'high'
                      ? 'bg-red-500/5 border-red-500/30'
                      : event.severity === 'medium'
                        ? 'bg-yellow-500/5 border-yellow-500/30'
                        : 'bg-blue-500/5 border-blue-500/30'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-2 h-2 rounded-full mt-2 ${
                        event.severity === 'high'
                          ? 'bg-red-400'
                          : event.severity === 'medium'
                            ? 'bg-yellow-400'
                            : 'bg-blue-400'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white mb-1">{event.event}</p>
                      <p className="text-xs text-gray-400">{event.camera}</p>
                      <p className="text-xs text-gray-500 mt-1">{event.time}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Camera List */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center">
                <Monitor className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">All Cameras</h3>
                <p className="text-xs text-gray-400">
                  {stats.online}/{stats.total} online
                </p>
              </div>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {cameras.map((camera) => (
                <motion.div
                  key={camera.id}
                  whileHover={{ x: 4 }}
                  onClick={() => setSelectedCamera(camera.id)}
                  className={`p-3 rounded-xl cursor-pointer transition-all ${
                    selectedCamera === camera.id
                      ? 'bg-blue-500/20 border border-blue-500/30'
                      : 'bg-gray-800/30 hover:bg-gray-800/50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          camera.status === 'online' ? 'bg-green-400 animate-pulse' : 'bg-red-400'
                        }`}
                      />
                      <div>
                        <p className="text-sm font-semibold text-white">{camera.name}</p>
                        <p className="text-xs text-gray-400">{camera.location}</p>
                      </div>
                    </div>
                    {camera.recording && <Activity className="w-4 h-4 text-red-400" />}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

// Stat Card Component
interface StatCardProps {
  icon: any;
  label: string;
  value: string;
  color: string;
}

function StatCard({ icon: Icon, label, value, color }: StatCardProps) {
  const colorClasses = {
    blue: 'from-blue-500 to-cyan-500',
    green: 'from-green-500 to-emerald-500',
    purple: 'from-purple-500 to-pink-500',
    red: 'from-red-500 to-orange-500',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.02 }}
      className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-5"
    >
      <div className="flex items-center gap-3 mb-3">
        <div
          className={`w-10 h-10 bg-gradient-to-br ${colorClasses[color]} rounded-xl flex items-center justify-center`}
        >
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
      <p className="text-3xl font-bold text-white mb-1">{value}</p>
      <p className="text-xs text-gray-400 font-medium">{label}</p>
    </motion.div>
  );
}

// Camera Feed Component
interface CameraFeedProps {
  camera: any;
  isSelected: boolean;
  onSelect: () => void;
}

function CameraFeed({ camera, isSelected, onSelect }: CameraFeedProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      onClick={onSelect}
      className={`relative aspect-video rounded-2xl overflow-hidden cursor-pointer border-2 transition-all ${
        isSelected ? 'border-blue-500 shadow-xl shadow-blue-500/20' : 'border-gray-700/50'
      } ${camera.status === 'offline' ? 'opacity-50' : ''}`}
    >
      {/* Camera Feed Placeholder */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
        {camera.status === 'offline' ? (
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-2" />
            <p className="text-sm text-red-400 font-semibold">Camera Offline</p>
          </div>
        ) : (
          <div className="relative w-full h-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
            <Camera className="w-16 h-16 text-gray-600" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          </div>
        )}
      </div>

      {/* Camera Info Overlay */}
      <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
        <div className="bg-black/70 backdrop-blur-sm px-3 py-2 rounded-lg">
          <p className="text-sm font-bold text-white">{camera.name}</p>
          <p className="text-xs text-gray-300">{camera.location}</p>
        </div>

        <div className="flex items-center gap-2">
          {camera.status === 'online' && (
            <div className="bg-green-500/20 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-xs font-semibold text-green-400">LIVE</span>
            </div>
          )}
          {camera.recording && (
            <div className="bg-red-500/20 backdrop-blur-sm p-2 rounded-lg">
              <Activity className="w-4 h-4 text-red-400" />
            </div>
          )}
        </div>
      </div>

      {/* Motion Detection Indicator */}
      {camera.motion && camera.status === 'online' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute top-3 left-1/2 -translate-x-1/2 bg-yellow-500/20 backdrop-blur-sm px-3 py-1 rounded-lg border border-yellow-500/30"
        >
          <p className="text-xs font-bold text-yellow-400 flex items-center gap-1">
            <Zap className="w-3 h-3" />
            Motion Detected
          </p>
        </motion.div>
      )}

      {/* Bottom Controls */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              setIsPlaying(!isPlaying);
            }}
            className="w-8 h-8 bg-black/70 backdrop-blur-sm hover:bg-black/90 rounded-lg flex items-center justify-center transition-all"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 text-white" />
            ) : (
              <Play className="w-4 h-4 text-white" />
            )}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              setIsMuted(!isMuted);
            }}
            className="w-8 h-8 bg-black/70 backdrop-blur-sm hover:bg-black/90 rounded-lg flex items-center justify-center transition-all"
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-white" />
            ) : (
              <Volume2 className="w-4 h-4 text-white" />
            )}
          </motion.button>
        </div>

        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => e.stopPropagation()}
            className="w-8 h-8 bg-black/70 backdrop-blur-sm hover:bg-black/90 rounded-lg flex items-center justify-center transition-all"
          >
            <Download className="w-4 h-4 text-white" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => e.stopPropagation()}
            className="w-8 h-8 bg-black/70 backdrop-blur-sm hover:bg-black/90 rounded-lg flex items-center justify-center transition-all"
          >
            <Maximize2 className="w-4 h-4 text-white" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
