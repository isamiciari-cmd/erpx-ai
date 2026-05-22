import { ReactNode, useState, useEffect } from "react";
import { LogOut, Clock, User, Building2, PlayCircle, StopCircle } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router";

interface CashierLayoutProps {
  children: ReactNode;
}

export default function CashierLayout({ children }: CashierLayoutProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [shiftActive, setShiftActive] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleLogout = async () => {
    if (shiftActive) {
      if (!confirm("You have an active shift. Are you sure you want to logout?")) {
        return;
      }
    }
    await signOut();
    navigate("/login");
  };

  const toggleShift = () => {
    if (shiftActive) {
      if (confirm("Are you sure you want to close your shift?")) {
        setShiftActive(false);
        // TODO: Save shift close data to Supabase
      }
    } else {
      setShiftActive(true);
      // TODO: Save shift open data to Supabase
    }
  };

  const formattedTime = currentTime.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const formattedDate = currentTime.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="h-screen flex flex-col bg-gray-950">
      {/* Cashier Top Bar */}
      <div className="h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6">
        {/* Left Section - Branch & Cashier Info */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-400" />
            <div>
              <p className="text-xs text-gray-500">Branch</p>
              <p className="text-sm font-semibold text-white">Main Branch</p>
            </div>
          </div>

          <div className="h-8 w-px bg-gray-700" />

          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-blue-400" />
            <div>
              <p className="text-xs text-gray-500">Cashier</p>
              <p className="text-sm font-semibold text-white">
                {user?.first_name} {user?.last_name}
              </p>
            </div>
          </div>
        </div>

        {/* Center Section - Time & Date */}
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-gray-400" />
          <div className="text-center">
            <p className="text-lg font-bold text-white">{formattedTime}</p>
            <p className="text-xs text-gray-500">{formattedDate}</p>
          </div>
        </div>

        {/* Right Section - Shift & Logout */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleShift}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              shiftActive
                ? "bg-green-500/20 border border-green-500/50 text-green-400"
                : "bg-gray-800 border border-gray-700 text-gray-400 hover:border-gray-600"
            }`}
          >
            {shiftActive ? (
              <>
                <StopCircle className="w-4 h-4" />
                <span className="text-sm font-semibold">Close Shift</span>
              </>
            ) : (
              <>
                <PlayCircle className="w-4 h-4" />
                <span className="text-sm font-semibold">Open Shift</span>
              </>
            )}
          </button>

          <div className="h-8 w-px bg-gray-700" />

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-lg text-red-400 transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-semibold">Logout</span>
          </button>
        </div>
      </div>

      {/* POS Content */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
