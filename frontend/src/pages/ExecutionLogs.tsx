import { useState, useEffect } from "react";
import {
  Clock,
  Search,
  Download,
  ChevronDown,
  Loader2,
  Wifi,
  X,
  ZoomIn,
  ZoomOut,
  Copy,
  FileText,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { logsApi, ExecutionLog, ApiError, getResourceUrl, getDownloadUrl } from "../lib/api";
import { useSSE, SSEEvent } from "../hooks/useSSE";

export default function ExecutionLogs() {
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [exporting, setExporting] = useState(false);

  // 排序状态
  const [sortBy, setSortBy] = useState<string>("start_time");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // 模态框状态
  const [selectedLog, setSelectedLog] = useState<ExecutionLog | null>(null);
  const [modalType, setModalType] = useState<"screenshot" | "log">("screenshot");
  const [imageZoom, setImageZoom] = useState(1);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [logText, setLogText] = useState<string>("");
  const [logLoading, setLogLoading] = useState(false);

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
        sort_by: sortBy,
        order: sortOrder,
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

  const formatDuration = (seconds: number): string => {
    // webhook 传入 duration_seconds 单位为秒，转换为分钟
    const minutes = seconds / 60;

    if (minutes < 60) {
      return `${Math.round(minutes)}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    if (remainingMinutes === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${remainingMinutes}m`;
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

  // 打开截图模态框
  const openScreenshotModal = (log: ExecutionLog) => {
    setSelectedLog(log);
    setModalType("screenshot");
    setImageZoom(1);
    setImageLoaded(false);
  };

  // 打开日志内容模态框
  const openLogModal = async (log: ExecutionLog) => {
    setSelectedLog(log);
    setModalType("log");
    setLogText("");
    setLogLoading(true);

    if (log.log_content) {
      try {
        // 通过后端代理加载日志内容（浏览器 HTTP 缓存 15 天）
        const proxyUrl = getResourceUrl(log.log_content);
        const response = await fetch(proxyUrl);
        const text = await response.text();
        setLogText(text);
      } catch {
        setLogText("加载日志内容失败");
      }
    }

    setLogLoading(false);
  };

  // 关闭模态框
  const closeModal = () => {
    setSelectedLog(null);
    setImageZoom(1);
    setImageLoaded(false);
    setLogText("");
    setLogLoading(false);
  };

  // 缩放图片
  const zoomIn = () => setImageZoom((z) => Math.min(z + 0.5, 3));
  const zoomOut = () => setImageZoom((z) => Math.max(z - 0.5, 0.5));
  const resetZoom = () => setImageZoom(1);

  // 下载截图 - 使用下载代理（不缓存）
  const downloadScreenshot = async () => {
    if (!selectedLog?.screenshot_path) return;

    const url = getDownloadUrl(selectedLog.screenshot_path);
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `screenshot_${selectedLog.id}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(blobUrl);
      document.body.removeChild(a);
      toast.success("截图下载成功");
    } catch {
      toast.error("截图下载失败");
    }
  };

  // 复制日志内容
  const copyLogContent = async () => {
    if (!selectedLog?.log_content) {
      toast.error("日志内容为空");
      return;
    }

    const textToCopy = logText || selectedLog.log_content;
    try {
      await navigator.clipboard.writeText(textToCopy);
      toast.success("日志内容已复制到剪贴板");
    } catch {
      toast.error("复制失败");
    }
  };

  // 下载日志文件 - 使用下载代理（不缓存）
  const downloadLogFile = async () => {
    if (!selectedLog?.log_content) {
      toast.error("日志内容为空");
      return;
    }

    try {
      const proxyUrl = getDownloadUrl(selectedLog.log_content);
      const response = await fetch(proxyUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `log_${selectedLog.id}.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(blobUrl);
      document.body.removeChild(a);
      toast.success("日志文件下载成功");
    } catch {
      toast.error("日志文件下载失败");
    }
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
          {/* 排序下拉框 */}
          <div className="relative">
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortBy(field);
                setSortOrder(order as "asc" | "desc");
                loadLogs(searchTerm, statusFilter);
              }}
              className="appearance-none bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm pr-10"
            >
              <option value="start_time-desc">开始时间 (最新优先)</option>
              <option value="start_time-asc">开始时间 (最早优先)</option>
              <option value="duration-desc">执行时长 (最长优先)</option>
              <option value="duration-asc">执行时长 (最短优先)</option>
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
                        {log.log_info || log.log_content ? (
                          <button
                            onClick={() => openLogModal(log)}
                            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
                            title="查看日志内容"
                          >
                            <FileText className="h-4 w-4" />
                          </button>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">
                            <FileText className="h-4 w-4" />
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {log.screenshot && log.screenshot_path ? (
                          <button
                            onClick={() => openScreenshotModal(log)}
                            className="group relative"
                            title="查看截图"
                          >
                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600">
                              <img
                                src={getResourceUrl(log.screenshot_path)}
                                alt="截图"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = "none";
                                }}
                              />
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/50 rounded-lg transition-opacity">
                              <ZoomIn className="h-5 w-5 text-white" />
                            </div>
                          </button>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">
                            <ImageIcon className="h-4 w-4" />
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

      {/* 截图模态框 */}
      {selectedLog && modalType === "screenshot" && selectedLog.screenshot_path && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* 遮罩层 */}
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={closeModal}
          />
          {/* 模态框内容 */}
          <div className="relative z-10 w-full h-full flex flex-col">
            {/* 头部 */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-900/80 border-b border-slate-700">
              <div className="flex items-center space-x-4">
                <h3 className="text-white font-medium">
                  {selectedLog.app_name} - 截图
                </h3>
                <span className="text-slate-400 text-sm">
                  {selectedLog.shadow_bot_account} | {selectedLog.host_ip}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={zoomOut}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                  title="缩小"
                >
                  <ZoomOut className="h-5 w-5" />
                </button>
                <span className="text-white text-sm w-16 text-center">
                  {Math.round(imageZoom * 100)}%
                </span>
                <button
                  onClick={zoomIn}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                  title="放大"
                >
                  <ZoomIn className="h-5 w-5" />
                </button>
                <button
                  onClick={resetZoom}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                  title="重置"
                >
                  <span className="text-sm font-medium">100%</span>
                </button>
                <button
                  onClick={downloadScreenshot}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                  title="下载截图"
                >
                  <Download className="h-5 w-5" />
                </button>
                <button
                  onClick={closeModal}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            {/* 图片区域 */}
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
              <div
                className="relative transition-transform duration-200"
                style={{ transform: `scale(${imageZoom})` }}
              >
                {!imageLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
                  </div>
                )}
                <img
                  src={getResourceUrl(selectedLog.screenshot_path)}
                  alt="执行截图"
                  className="max-w-none"
                  style={{ maxWidth: "90vw", maxHeight: "calc(90vh - 100px)" }}
                  onLoad={() => setImageLoaded(true)}
                  onError={() => setImageLoaded(true)}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 日志内容模态框 */}
      {selectedLog && modalType === "log" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* 遮罩层 */}
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={closeModal}
          />
          {/* 模态框内容 */}
          <div className="relative z-10 w-full max-w-4xl h-[80vh] bg-white dark:bg-slate-800 rounded-xl shadow-2xl flex flex-col">
            {/* 头部 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {selectedLog.app_name} - 日志内容
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {selectedLog.shadow_bot_account} | {selectedLog.host_ip} |{" "}
                  {formatTime(selectedLog.start_time)}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                {selectedLog.log_content && (
                  <>
                    <button
                      onClick={copyLogContent}
                      className="flex items-center px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      复制
                    </button>
                    <button
                      onClick={downloadLogFile}
                      className="flex items-center px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      下载
                    </button>
                  </>
                )}
                <button
                  onClick={closeModal}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            {/* 日志内容 */}
            <div className="flex-1 overflow-auto p-6">
              {logLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
                  <span className="ml-2 text-slate-500">加载中...</span>
                </div>
              ) : logText ? (
                <pre className="whitespace-pre-wrap font-mono text-sm text-slate-700 dark:text-slate-300">
                  {logText}
                </pre>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-400">
                  <FileText className="h-12 w-12 mb-4" />
                  <p>暂无日志内容</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
