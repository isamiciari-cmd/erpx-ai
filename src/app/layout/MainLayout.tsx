import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import DevModeIndicator from '../components/DevModeIndicator';

export default function MainLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="h-screen flex bg-[#0A0E17] overflow-hidden">
      <DevModeIndicator />
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar />
        <div className="flex-1 overflow-auto p-8 bg-gradient-to-br from-[#0A0E17] via-[#0B0F19] to-[#0A0E17]">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
