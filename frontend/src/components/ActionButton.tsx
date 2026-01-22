import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ActionButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

export function ActionButton({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  className = ""
}: ActionButtonProps) {
  // Base styles
  const baseClasses = "flex items-center justify-center font-medium rounded transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";
  
  // Variant styles
  const variantClasses = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500 dark:focus:ring-indigo-400",
    secondary: "bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 focus:ring-slate-500 dark:focus:ring-slate-400",
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 dark:focus:ring-red-400",
    success: "bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 dark:focus:ring-green-400"
  };
  
  // Size styles
  const sizeClasses = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base"
  };
  
  // Disabled and loading styles
  const stateClasses = disabled || loading
    ? "opacity-70 cursor-not-allowed"
    : "";
  
  // Combine all classes
  const combinedClasses = cn(
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    stateClasses,
    className
  );
  
  return (
    <button 
      onClick={onClick}
      disabled={disabled || loading}
      className={combinedClasses}
    >
      {children}
    </button>
  );
}