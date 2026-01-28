import { useEffect, useState } from "react";
import { LayoutDashboard, Users, TerminalSquare, Clock, MoreHorizontal, Loader2, Wifi } from "lucide-react";
import { Link } from "react-router-dom";
import { dashboardApi, logsApi, ExecutionLog, DashboardStats, PerformanceTrends, ApiError } from "../lib/api";
import { useSSE, SSEEvent } from "../hooks/useSSE";

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [performance, setPerformance] = useState<PerformanceTrends | null>(null);
  const [recentLogs, setRecentLogs] = useState<ExecutionLog[]>([]);
  const [loading, setLoading] = useState(true);

  const { connected, subscribe } = useSSE({
    autoReconnect: true,
    heartbeat: true,
  });

  // 加载仪表盘数据
  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // 并行加载所有数据
      const [statsData, performanceData, logsData] = await Promise.all([
        dashboardApi.getStats(),
        dashboardApi.getPerformance(7),
        logsApi.getLogs({ page: 1, page_size: 5 })
      ]);

      setStats(statsData);
      setPerformance(performanceData);
      setRecentLogs(logsData.items || []);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      if (error instanceof ApiError) {
        console.error(`加载失败: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // SSE 事件处理
  useEffect(() => {
    const unsubLog = subscribe('log_created', (event: SSEEvent) => {
      console.log('[仪表盘] 收到日志创建事件:', event.data);
      // 刷新仪表盘数据
      loadDashboardData();
    });

    const unsubAccount = subscribe('account_updated', (event: SSEEvent) => {
      console.log('[仪表盘] 收到账号更新事件:', event.data);
      loadDashboardData();
    });

    const unsubTask = subscribe('task_updated', (event: SSEEvent) => {
      console.log('[仪表盘] 收到任务更新事件:', event.data);
      loadDashboardData();
    });

    return () => {
      unsubLog();
      unsubAccount();
      unsubTask();
    };
  }, [subscribe]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  // 格式化持续时间（ webhook 传入 duration_seconds 单位为秒，转换为分钟）
  const formatDuration = (seconds: number) => {
    const minutes = seconds / 60;
    if (minutes < 60) {
      return `${Math.round(minutes)}分钟`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (mins === 0) {
      return `${hours}小时`;
    }
    return `${hours}小时${mins}分钟`;
  };

  // 格式化状态显示
  const getStatusDisplay = (status: string) => {
    const statusMap: Record<string, { label: string; color: string }> = {
      completed: { label: "已完成", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
      running: { label: "运行中", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
      failed: { label: "已失败", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" },
      pending: { label: "待启动", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300" },
    };
    return statusMap[status] || { label: status, color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300" };
  };

  // 格式化时间
  const formatTime = (timeString: string) => {
    try {
      const date = new Date(timeString);
      return date.toLocaleString('zh-CN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return timeString;
    }
  };

  // 准备性能趋势图表数据
  const performanceData = performance?.dailyStats.map(stat => ({
    name: new Date(stat.date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
    value: stat.totalExecutions
  })) || [];

  // 准备状态分布数据
  const statusData = stats ? [
    { name: '已完成', value: stats.tasks.by_status.completed, color: '#10b981' },
    { name: '运行中', value: stats.tasks.by_status.running, color: '#3b82f6' },
    { name: '待启动', value: stats.tasks.by_status.pending, color: '#f59e0b' },
    { name: '已失败', value: stats.tasks.by_status.failed, color: '#ef4444' },
  ].filter(item => item.value > 0) : [];

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <span className="ml-2 text-slate-600 dark:text-slate-400">加载中...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">仪表盘</h1>
          {/* SSE 连接状态指示器 */}
          <div className="ml-3 flex items-center">
            <span
              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                connected
                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                  : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
              }`}
            >
              <Wifi className={`h-3 w-3 mr-1 ${connected ? "animate-pulse" : ""}`} />
              {connected ? "实时" : "离线"}
            </span>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">总账号数</p>
              <h3 className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">
                {stats?.accounts.total || 0}
              </h3>
            </div>
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-green-600 dark:text-green-400 text-sm font-medium">
            <span className="mr-1">↑ {stats?.accounts.by_status.running || 0}</span>
            <span className="text-slate-500 dark:text-slate-400 font-normal">运行中</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">活跃任务</p>
              <h3 className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">
                {(stats?.tasks.by_status.running || 0) + (stats?.tasks.by_status.pending || 0)}
              </h3>
            </div>
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <TerminalSquare className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-green-600 dark:text-green-400 text-sm font-medium">
            <span className="mr-1">↗ {((performance?.completionRate || 0) * 100).toFixed(0)}%</span>
            <span className="text-slate-500 dark:text-slate-400 font-normal">成功率</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">已完成任务</p>
              <h3 className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">
                {stats?.tasks.by_status.completed || 0}
              </h3>
            </div>
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <LayoutDashboard className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-green-600 dark:text-green-400 text-sm font-medium">
            <span className="mr-1">✓ {stats?.execution_logs.success_rate.toFixed(1) || 0}%</span>
            <span className="text-slate-500 dark:text-slate-400 font-normal">执行成功率</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">平均执行时间</p>
              <h3 className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">
                {formatDuration(performance?.avgDuration || 0)}
              </h3>
            </div>
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-slate-500 dark:text-slate-400 text-sm font-medium">
            <span className="mr-1">⏱</span>
            <span className="font-normal">最近7天</span>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Trend Chart */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 border border-slate-200 dark:border-slate-700 lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">性能趋势</h2>
            <button className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
              <MoreHorizontal className="h-5 w-5 text-slate-500 dark:text-slate-400" />
            </button>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '8px', 
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }} 
                />
                <Area type="monotone" dataKey="value" stroke="#6366f1" fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Task Status Pie Chart */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">任务状态分布</h2>
            <button className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
              <MoreHorizontal className="h-5 w-5 text-slate-500 dark:text-slate-400" />
            </button>
          </div>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}个`}
                  labelLine={false}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 shadow-md">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{`${payload[0].name}: ${payload[0].value} 个`}</p>
                      </div>
                    );
                  }
                  return null;
                }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-1 gap-3 mt-4">
            {statusData.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }}></div>
                  <span className="text-sm text-slate-700 dark:text-slate-300">{item.name}</span>
                </div>
                <span className="text-sm font-medium text-slate-900 dark:text-white">{item.value} 个</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Tasks */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">最近执行记录</h2>
          <Link to="/execution-logs" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 text-sm font-medium">
            查看全部
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50">
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">任务名称</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">账号</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">状态</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">开始时间</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">执行时长</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {recentLogs.map((log) => {
                const statusInfo = getStatusDisplay(log.status);
                return (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">
                      {log.text || log.app_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                      {log.shadow_bot_account}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                      {formatTime(log.start_time)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                      {formatDuration(log.duration)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {recentLogs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <TerminalSquare className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-1">暂无执行记录</h3>
            <p className="text-slate-500 dark:text-slate-400">开始执行任务后，这里将显示最近的执行记录</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Import missing components
import {
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
