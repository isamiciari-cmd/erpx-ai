import { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { LogOut, Clock, User, Building2, PlayCircle, StopCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getCurrentShift, openShift, closeShift, type Shift } from '../../services/salesService';

export default function CashierLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [shift, setShift] = useState<Shift | null>(null);
  const [shiftBusy, setShiftBusy] = useState(true);
  const [shiftError, setShiftError] = useState('');
  const shiftMutation = useRef(false);
  const shiftActive = shift?.status === 'open';

  useEffect(() => {
    let disposed = false;
    setShift(null);
    if (!user?.company_id || !user.branch_id || !user.id) { setShiftBusy(false); return; }
    setShiftBusy(true);
    getCurrentShift(user.company_id,user.branch_id,user.id)
      .then(value => { if (!disposed) { setShift(value); setShiftError(''); } })
      .catch(error => { if (!disposed) setShiftError(error instanceof Error ? error.message : 'Unable to load the shift'); })
      .finally(() => { if (!disposed) setShiftBusy(false); });
    return () => { disposed = true; };
  },[user?.company_id,user?.branch_id,user?.id]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleLogout = async () => {
    if (shiftActive) {
      if (!confirm('You have an active shift. Are you sure you want to logout?')) {
        return;
      }
    }
    await signOut();
    navigate('/login');
  };

  const toggleShift = async () => {
    if (shiftMutation.current || !user?.company_id || !user.branch_id) return;
    const cashInput = prompt(shiftActive ? 'Counted cash in the drawer (SAR):' : 'Opening cash in the drawer (SAR):','0');
    if (cashInput === null) return;
    if (!/^\d+(\.\d{1,2})?$/.test(cashInput.trim()) || !Number.isFinite(Number(cashInput))) {
      setShiftError('Enter a nonnegative cash amount with at most two decimal places'); return;
    }
    shiftMutation.current = true; setShiftBusy(true); setShiftError('');
    try {
      if (shiftActive && shift?.id) {
        const closed = await closeShift(shift.id,Number(cashInput));
        setShift(null);
        alert(`Shift closed. Expected cash: ${Number(closed.expected_cash).toFixed(2)} SAR. Difference: ${Number(closed.cash_difference).toFixed(2)} SAR.`);
      } else {
        const current = await getCurrentShift(user.company_id,user.branch_id,user.id);
        setShift(current ?? await openShift({ company_id:user.company_id,branch_id:user.branch_id,cashier_id:user.id,
          shift_number:`SHIFT-${crypto.randomUUID()}`,opened_at:new Date().toISOString(),opening_cash:Number(cashInput),status:'open' }));
      }
    } catch (error) {
      setShiftError(error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Unable to save the shift');
    } finally { shiftMutation.current = false; setShiftBusy(false); }
  };

  const formattedTime = currentTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const formattedDate = currentTime.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
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
              <p className="text-sm font-semibold text-white">{user?.branch?.name || (user?.branch_id ? 'Branch name unavailable' : 'Branch not assigned')}</p>
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

        {/* Right Section - Dashboard, Shift & Logout */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-gray-700 hover:border-blue-500/50 rounded-lg text-gray-300 hover:text-white transition-all"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-semibold">Dashboard</span>
          </button>
          <div className="h-8 w-px bg-gray-700" />
          <button
            onClick={toggleShift}
            disabled={shiftBusy || !user?.branch_id}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              shiftActive
                ? 'bg-green-500/20 border border-green-500/50 text-green-400'
                : 'bg-gray-800 border border-gray-700 text-gray-400 hover:border-gray-600'
            }`}
          >
            {shiftActive ? (
              <>
                <StopCircle className="w-4 h-4" />
                <span className="text-sm font-semibold">{shiftBusy ? 'Saving…' : 'Close Shift'}</span>
              </>
            ) : (
              <>
                <PlayCircle className="w-4 h-4" />
                <span className="text-sm font-semibold">{shiftBusy ? 'Loading…' : 'Open Shift'}</span>
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

      {shiftError && <div role="alert" className="bg-red-950 px-6 py-2 text-sm text-red-200">{shiftError}</div>}

      {/* POS Content */}
      <div className="flex-1 overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}
