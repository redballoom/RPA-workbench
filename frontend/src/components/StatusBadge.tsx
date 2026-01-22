import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: 'completed' | 'pending' | 'running' | 'failed';
  className?: string;
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const getStatusInfo = () => {
    switch (status) {
      case 'completed':
        return {
          className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
          text: '已完成'
        };
      case 'running':
        return {
          className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 animate-pulse',
          text: '运行中'
        };
      case 'failed':
        return {
          className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
          text: '已失败'
        };
      case 'pending':
      default:
        return {
          className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
          text: '待启动'
        };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <span className={cn(`px-2 py-1 text-xs rounded-full ${statusInfo.className}`, className)}>
      {statusInfo.text}
    </span>
  );
}