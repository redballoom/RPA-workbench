import { NavLink } from "react-router-dom";
import { 
  LayoutDashboard, 
  Users, 
  TerminalSquare, 
  Clock, 
  ChevronRight 
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

export function Sidebar() {
  const { toggleTheme, isDark } = useTheme();
  
  const navItems = [
    {
      icon: <LayoutDashboard className="h-5 w-5" />,
      label: "Dashboard",
      path: "/dashboard"
    },
    {
      icon: <Users className="h-5 w-5" />,
      label: "Account Management",
      path: "/account-management"
    },
    {
      icon: <TerminalSquare className="h-5 w-5" />,
      label: "Task Control",
      path: "/task-control"
    },
    {
      icon: <Clock className="h-5 w-5" />,
      label: "Execution Logs",
      path: "/execution-logs"
    }
  ];

  return (
    <aside className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
        <h1 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">RPA Workbench</h1>
        <button 
          onClick={toggleTheme}
          className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Toggle theme"
        >
          {isDark ? "☀️" : "🌙"}
        </button>
      </div>
      
      <nav className="flex-1 py-4">
        <div className="px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Main Menu
        </div>
        <ul className="mt-2">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center px-4 py-3 text-sm transition-colors ${
                    isActive 
                      ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-medium" 
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`
                }
              >
                <span className="mr-3">{item.icon}</span>
                <span>{item.label}</span>
                {item.path === "/dashboard" && (
                  <span className="ml-auto bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-200 text-xs px-2 py-0.5 rounded-full">
                    New
                  </span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      
      <div className="p-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Users className="h-4 w-4" />
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium">Admin User</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">admin@example.com</p>
          </div>
        </div>
      </div>
    </aside>
  );
}