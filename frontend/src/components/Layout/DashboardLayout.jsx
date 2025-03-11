import React from 'react';
import { Link, Outlet } from '@tanstack/react-router';
import { 
  Home, 
  Users, 
  Calendar, 
  Package, 
  CreditCard, 
  Settings, 
  LogOut, 
  Bell, 
  Clock, 
  User,
  BarChart
} from 'lucide-react';
import useAuth from '../../hooks/useAuth';

const DashboardLayout = () => {
  const { user, isAdmin, logout } = useAuth();

  // Admin navigation items
  const adminNavItems = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Clients', href: '/dashboard/clients', icon: Users },
    { name: 'Plans', href: '/dashboard/plans', icon: Package },
    { name: 'Reservations', href: '/dashboard/reservations', icon: Calendar },
    { name: 'Check-In', href: '/dashboard/visits/check-in', icon: Clock },
    { name: 'Payments', href: '/dashboard/payments', icon: CreditCard },
    { name: 'Notifications', href: '/dashboard/notifications/create', icon: Bell },
    { name: 'Reports', href: '/dashboard/reports', icon: BarChart },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ];

  // Regular user navigation items
  const userNavItems = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'My Plans', href: '/dashboard/client/plans', icon: Package },
    { name: 'Make Reservation', href: '/dashboard/reservations/create', icon: Calendar },
    { name: 'Make Payment', href: '/dashboard/payments/create', icon: CreditCard },
    { name: 'Register Child', href: '/dashboard/clients/register', icon: Users },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ];

  // Use the appropriate navigation items based on user role
  const navItems = isAdmin ? adminNavItems : userNavItems;

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64">
          <div className="flex flex-col h-0 flex-1 bg-gray-800">
            <div className="flex items-center h-16 flex-shrink-0 px-4 bg-gray-900">
              <h1 className="text-xl font-bold text-white">CasaEnElArbol</h1>
            </div>
            <div className="flex-1 flex flex-col overflow-y-auto">
              <nav className="flex-1 px-2 py-4 space-y-1">
                {navItems.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={({ isActive }) =>
                      `flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                        isActive
                          ? 'bg-gray-900 text-white'
                          : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                      }`
                    }
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </Link>
                ))}
              </nav>
            </div>
            <div className="flex-shrink-0 flex border-t border-gray-700 p-4">
              <div className="flex items-center">
                <div>
                  <div className="flex items-center">
                    <User className="h-8 w-8 rounded-full text-gray-400 bg-gray-700 p-1" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-white">
                        {user?.full_name || user?.email}
                      </p>
                      <p className="text-xs font-medium text-gray-400">
                        {isAdmin ? 'Administrator' : 'User'}
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="ml-auto flex-shrink-0 bg-gray-800 p-1 rounded-full text-gray-400 hover:text-white"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile header */}
      <div className="md:hidden bg-gray-800 text-white p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">CasaEnElArbol</h1>
        <div className="flex items-center space-x-4">
          <span>{user?.full_name || user?.email}</span>
          <button
            onClick={logout}
            className="p-1 rounded-full text-gray-400 hover:text-white"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout; 