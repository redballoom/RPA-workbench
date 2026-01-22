import { useState, useEffect } from "react";
import { Clock, Search, Filter, Download, ChevronDown, MoreHorizontal, Loader2, Wifi } from "lucide-react";
import { toast } from "sonner";
import { logsApi, ExecutionLog, ApiError } from "../lib/api";
import { useSSE, SSEEvent } from "../hooks/useSSE";

export default function ExecutionLogs() {
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [exporting, setExporting] = useState(false);

  const { connected, subscribe } = useSSE({
    autoReconnect: true,
    heartbeat: true,
  });

  // 加载日志列表
  const loadLogs = async (search?: string, status?: string) => {
    try {
      setLoading(true);
      const response = await logsApi.getLogs({
        search: search || searchTerm,
        status: status && status !== "all" ? status : undefined,
        page: 1,
        page_size: 100,
      });
      setLogs(response.items || []);
    } catch (error) {
      console.error('Failed to load logs:', error);
      if (error instanceof ApiError) {
        toast.error(`加载失败: ${error.message}`);
      } else {
        toast.error('加载日志列表失败');
      }
    } finally {
      setLoading(false);
    }
  };

  // SSE 事件处理
  useEffect(() => {
    const unsubLog = subscribe('log_created', (event: SSEEvent) => {
      console.log('[执行日志] 收到日志创建事件:', event.data);
      // 刷新日志列表
      loadLogs(searchTerm, statusFilter);
      toast.info('新执行日志已添加', {
        description: event.data.app_name
          ? `${event.data.app_name} - ${event.data.status === 'completed' ? '成功' : '失败'}`
          : undefined,
      });
    });

    return () => {
      unsubLog();
    };
  }, [subscribe, searchTerm, statusFilter]);

  // 初始加载
  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.app_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.shadow_bot_account.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.host_ip.includes(searchTerm) ||
      log.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || log.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "completed":
        return {
          className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
          text: "已完成"
        };
      case "failed":
        return {
          className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
          text: "已失败"
        };
      case "running":
        return {
          className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 animate-pulse",
          text: "运行中"
        };
      default:
        return {
          className: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
          text: status
        };
    }
  };

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes.toFixed(2)}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${remainingMinutes.toFixed(0)}m`;
  };

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

  // 导出日志
  const handleExport = async () => {
    try {
      setExporting(true);
      const blob = await logsApi.exportLogs();
      
      // 创建下载链接
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `execution_logs_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('日志导出成功');
    } catch (error) {
      console.error('Failed to export logs:', error);
      if (error instanceof ApiError) {
        toast.error(`导出失败: ${error.message}`);
      } else {
        toast.error('导出日志失败');
      }
    } finally {
      setExporting(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    loadLogs(value, statusFilter);
  };

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status);
    loadLogs(searchTerm, status);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <Clock className="h-6 w-6 text-indigo-600 dark:text-indigo-400 mr-2" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">执行日志</h1>
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
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="搜索日志..."
              className="pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => handleStatusFilter(e.target.value)}
              className="appearance-none bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm pr-10"
            >
              <option value="all">全部状态</option>
              <option value="completed">已完成</option>
              <option value="failed">已失败</option>
              <option value="running">运行中</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
              <ChevronDown className="h-4 w-4" />
            </div>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg transition-colors text-sm flex items-center"
          >
            {exporting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Download className="h-4 w-4 mr-2" />
            导出
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          <span className="ml-2 text-slate-600 dark:text-slate-400">加载中...</span>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden relative">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    应用名称
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    机器人账号
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    开始时间
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    结束时间
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    执行时长
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    主机IP
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    日志信息
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    截图
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredLogs.map((log) => {
                  const statusInfo = getStatusInfo(log.status);

                  return (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">
                        {log.id.slice(0, 8)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                        {log.app_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                        {log.shadow_bot_account}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${statusInfo.className}`}>
                          {statusInfo.text}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                        {formatTime(log.start_time)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                        {formatTime(log.end_time)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">
                        {formatDuration(log.duration)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                        <span className="font-medium text-indigo-600 dark:text-indigo-400">
                          {log.host_ip}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {log.log_info ? (
                          <button className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300">
                            <Filter className="h-4 w-4" />
                          </button>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">
                            <Filter className="h-4 w-4" />
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {log.screenshot ? (
                          <button className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300">
                            <Filter className="h-4 w-4" />
                          </button>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">
                            <Filter className="h-4 w-4" />
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredLogs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <Clock className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-1">暂无执行日志</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-4">
                {searchTerm
                  ? `没有找到匹配 "${searchTerm}" 的日志`
                  : statusFilter !== "all"
                  ? `没有找到状态为 "${statusFilter}" 的日志`
                  : "还没有执行任何任务"}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
