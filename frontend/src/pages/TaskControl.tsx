import { useState, useEffect } from "react";
import { TerminalSquare, Play, Square, Search, Settings, FileText, Calendar, Plus, X, AlertCircle, Trash2, Loader2, Wifi, Zap } from "lucide-react";
import { toast } from "sonner";
import { tasksApi, accountsApi, Task, Account, ApiError } from "../lib/api";
import { useSSE, SSEEvent } from "../hooks/useSSE";

// API 基础地址（用于代理内网穿透请求）
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export default function TaskControl() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    task_name: "",
    shadow_bot_account: "",
    host_ip: "",
    app_name: "",
    config_file: false,
    config_info: false,
    config_file_path: "",
    config_json: "",
  });

  // 配置相关的额外状态
  const [configFileObj, setConfigFileObj] = useState<File | null>(null);
  const [configFileUploading, setConfigFileUploading] = useState(false);
  const [configJsonValid, setConfigJsonValid] = useState(true);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const { connected, subscribe } = useSSE({
    autoReconnect: true,
    heartbeat: true,
  });

  // 加载任务列表
  const loadTasks = async (search?: string) => {
    try {
      setLoading(true);
      const response = await tasksApi.getTasks({
        search: search || searchTerm,
        page: 1,
        page_size: 100,
      });
      setTasks(response.items || []);
    } catch (error) {
      console.error('Failed to load tasks:', error);
      if (error instanceof ApiError) {
        toast.error(`加载任务失败: ${error.message}`);
      } else {
        toast.error('加载任务列表失败');
      }
    } finally {
      setLoading(false);
    }
  };

  // 加载账号列表（用于下拉选择）
  const loadAccounts = async () => {
    try {
      const response = await accountsApi.getAccounts({ page: 1, page_size: 100 });
      setAccounts(response.items || []);
    } catch (error) {
      console.error('Failed to load accounts:', error);
    }
  };

  // SSE 事件处理
  useEffect(() => {
    // 任务更新事件
    const unsubTask = subscribe('task_updated', (event: SSEEvent) => {
      console.log('[任务控制] 收到任务更新事件:', event.data);
      loadTasks();
    });

    // 日志创建事件（可能影响任务状态）
    const unsubLog = subscribe('log_created', (event: SSEEvent) => {
      console.log('[任务控制] 收到日志创建事件:', event.data);
      // 当有日志创建时，可能意味着关联的任务状态需要更新
      loadTasks();
    });

    return () => {
      unsubTask();
      unsubLog();
    };
  }, [subscribe]);

  // 初始加载
  useEffect(() => {
    loadTasks();
    loadAccounts();
  }, []);

  const filteredTasks = tasks.filter((task) =>
    task.task_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.shadow_bot_account.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.app_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.host_ip.includes(searchTerm)
  );

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.task_name.trim()) {
      newErrors.task_name = "任务名称不能为空";
    }

    if (!formData.shadow_bot_account.trim()) {
      newErrors.shadow_bot_account = "机器人账号不能为空";
    }

    if (!formData.host_ip.trim()) {
      newErrors.host_ip = "主机IP不能为空";
    } else if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(formData.host_ip)) {
      newErrors.host_ip = "IP地址格式不正确";
    }

    if (!formData.app_name.trim()) {
      newErrors.app_name = "应用名称不能为空";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 处理配置方式变更（非互斥，可以同时选择）
  const handleConfigTypeChange = (type: 'file' | 'info', checked: boolean) => {
    if (type === 'file') {
      setFormData((prev) => ({
        ...prev,
        config_file: checked,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        config_info: checked,
      }));
    }
  };

  // 处理 JSON 配置输入
  const handleConfigJsonChange = (value: string) => {
    setFormData((prev) => ({ ...prev, config_json: value }));
    // 验证 JSON 格式
    try {
      if (value.trim()) {
        JSON.parse(value);
        setConfigJsonValid(true);
      } else {
        setConfigJsonValid(true);
      }
    } catch {
      setConfigJsonValid(false);
    }
  };

  // 处理配置文件选择
  const handleConfigFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setConfigFileObj(file);
    }
  };

  // 上传配置文件到 OSS
  const uploadConfigFile = async (): Promise<string | null> => {
    if (!configFileObj || !formData.shadow_bot_account || !formData.app_name) {
      return formData.config_file_path || null;
    }

    setConfigFileUploading(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', configFileObj);
      formDataUpload.append('shadow_bot_account', formData.shadow_bot_account);
      formDataUpload.append('app_name', formData.app_name);

      const response = await fetch(`${API_BASE_URL}/resources/upload/config`, {
        method: 'POST',
        body: formDataUpload,
      });

      if (!response.ok) {
        throw new Error('上传失败');
      }

      const result = await response.json();
      if (result.success && result.file_url) {
        return result.file_url;
      }
      return null;
    } catch (error) {
      console.error('上传配置文件失败:', error);
      toast.error('上传配置文件失败');
      return null;
    } finally {
      setConfigFileUploading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    // 清除对应字段的错误
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  // 当选择的账号改变时，自动填充主机IP
  const handleAccountChange = (accountName: string) => {
    const selectedAccount = accounts.find(acc => acc.shadow_bot_account === accountName);
    if (selectedAccount) {
      setFormData((prev) => ({
        ...prev,
        shadow_bot_account: accountName,
        host_ip: selectedAccount.host_ip,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        shadow_bot_account: accountName,
        host_ip: "",
      }));
    }
  };

  const handleAddTask = async () => {
    if (!validateForm()) return;

    // 验证配置信息
    if (formData.config_info && formData.config_json && !configJsonValid) {
      toast.error("JSON 格式不正确");
      return;
    }

    try {
      setSubmitting(true);

      // 如果选择了配置文件，先上传
      let configFilePath = "";
      if (formData.config_file && configFileObj) {
        const uploaded = await uploadConfigFile();
        if (!uploaded) {
          toast.error("配置文件上传失败");
          return;
        }
        configFilePath = uploaded;
      }

      await tasksApi.createTask({
        task_name: formData.task_name,
        shadow_bot_account: formData.shadow_bot_account,
        host_ip: formData.host_ip,
        app_name: formData.app_name,
        config_file: formData.config_file,
        config_info: formData.config_info,
        config_file_path: configFilePath || undefined,
        config_json: formData.config_json || undefined,
      });

      toast.success("任务创建成功");
      setIsAddModalOpen(false);
      resetForm();
      loadTasks();
    } catch (error) {
      console.error('Failed to create task:', error);
      if (error instanceof ApiError) {
        toast.error(`创建失败: ${error.message}`);
      } else {
        toast.error('创建任务失败');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditTask = async () => {
    if (!selectedTask || !validateForm()) return;

    // 验证配置信息
    if (formData.config_info && formData.config_json && !configJsonValid) {
      toast.error("JSON 格式不正确");
      return;
    }

    try {
      setSubmitting(true);

      // 如果选择了配置文件且有新文件，先上传
      let configFilePath = selectedTask.config_file_path || "";
      if (formData.config_file && configFileObj) {
        const uploaded = await uploadConfigFile();
        if (!uploaded) {
          toast.error("配置文件上传失败");
          return;
        }
        configFilePath = uploaded;
      }

      await tasksApi.updateTask(selectedTask.id, {
        task_name: formData.task_name,
        shadow_bot_account: formData.shadow_bot_account,
        host_ip: formData.host_ip,
        app_name: formData.app_name,
        config_file: formData.config_file,
        config_info: formData.config_info,
        config_file_path: configFilePath || undefined,
        config_json: formData.config_json || undefined,
      });

      toast.success("任务更新成功");
      setIsEditModalOpen(false);
      setSelectedTask(null);
      resetForm();
      loadTasks();
    } catch (error) {
      console.error('Failed to update task:', error);
      if (error instanceof ApiError) {
        toast.error(`更新失败: ${error.message}`);
      } else {
        toast.error('更新任务失败');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!selectedTask) return;

    try {
      setSubmitting(true);
      await tasksApi.deleteTask(selectedTask.id);

      toast.success("任务删除成功");
      setIsDeleteModalOpen(false);
      setSelectedTask(null);
      loadTasks();
    } catch (error) {
      console.error('Failed to delete task:', error);
      if (error instanceof ApiError) {
        toast.error(`删除失败: ${error.message}`);
      } else {
        toast.error('删除任务失败');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartTask = async (task: Task) => {
    // 获取关联账号的端口
    const relatedAccount = accounts.find(acc => acc.shadow_bot_account === task.shadow_bot_account);
    const port = relatedAccount?.port || 0;

    // 调用后端代理接口发送控制请求
    const proxyUrl = `${API_BASE_URL}/resources/proxy/intranet?backend_ip=${encodeURIComponent(task.host_ip)}&backend_port=${port}&tak=${encodeURIComponent(task.app_name)}&target=START`;
    console.log(`[启动任务] 发送代理请求: ${proxyUrl}`);

    try {
      const proxyResponse = await fetch(proxyUrl, { method: "GET" });
      const proxyResult = await proxyResponse.json();

      if (proxyResult.success) {
        toast.success("启动请求已发送，等待影刀确认");
        // 【确认模式】不更新状态，等待 webhook/confirm 回调
        loadTasks();  // 刷新列表显示当前状态
      } else {
        toast.error(`启动失败: ${proxyResult.message}`);
      }
    } catch (error) {
      console.error('Failed to start task:', error);
      toast.error("启动请求失败，请检查网络连接");
    }
  };

  const handleStopTask = async (task: Task) => {
    // 获取关联账号的端口
    const relatedAccount = accounts.find(acc => acc.shadow_bot_account === task.shadow_bot_account);
    const port = relatedAccount?.port || 0;

    // 调用后端代理接口发送控制请求
    const proxyUrl = `${API_BASE_URL}/resources/proxy/intranet?backend_ip=${encodeURIComponent(task.host_ip)}&backend_port=${port}&tak=${encodeURIComponent(task.app_name)}&target=ALL`;
    console.log(`[停止任务] 发送代理请求: ${proxyUrl}`);

    try {
      const proxyResponse = await fetch(proxyUrl, { method: "GET" });
      const proxyResult = await proxyResponse.json();

      if (proxyResult.success) {
        toast.success("停止请求已发送，等待影刀确认");
        // 【确认模式】不更新状态，等待 webhook/confirm 回调
        loadTasks();  // 刷新列表显示当前状态
      } else {
        toast.error(`停止失败: ${proxyResult.message}`);
      }
    } catch (error) {
      console.error('Failed to stop task:', error);
      toast.error("停止请求失败，请检查网络连接");
    }
  };

  // 强制停止 - 直接更新状态
  const handleForceStop = async (task: Task) => {
    if (!confirm(`确定要强制停止任务 "${task.task_name}" 吗？\n\n此操作将直接更新状态为"待启动"，不等待影刀确认。`)) {
      return;
    }

    try {
      await tasksApi.forceStop(task.id);
      toast.success("任务已强制停止");
      loadTasks(); // 刷新列表
    } catch (error) {
      console.error('Failed to force stop task:', error);
      toast.error("强制停止失败");
    }
  };

  const openEditModal = (task: Task) => {
    setSelectedTask(task);
    setFormData({
      task_name: task.task_name,
      shadow_bot_account: task.shadow_bot_account,
      host_ip: task.host_ip,
      app_name: task.app_name,
      config_file: task.config_file,
      config_info: task.config_info,
      config_file_path: task.config_file_path || "",
      config_json: task.config_json || "",
    });
    setConfigFileObj(null);  // 清空已选文件
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (task: Task) => {
    setSelectedTask(task);
    setIsDeleteModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      task_name: "",
      shadow_bot_account: "",
      host_ip: "",
      app_name: "",
      config_file: false,
      config_info: false,
      config_file_path: "",
      config_json: "",
    });
    setConfigFileObj(null);
    setErrors({});
  };

  const closeModals = () => {
    setIsAddModalOpen(false);
    setIsEditModalOpen(false);
    setIsDeleteModalOpen(false);
    setSelectedTask(null);
    resetForm();
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    loadTasks(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <TerminalSquare className="h-6 w-6 text-indigo-600 dark:text-indigo-400 mr-2" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">任务控制</h1>
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
              placeholder="搜索任务..."
              className="pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            添加任务
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          <span className="ml-2 text-slate-600 dark:text-slate-400">加载中...</span>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="relative">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      任务名称
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      机器人账号
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      主机IP:端口
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      应用名称
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      状态
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      配置
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {filteredTasks.map((task) => {
                    // 获取关联账号的端口信息
                    const relatedAccount = accounts.find(acc => acc.shadow_bot_account === task.shadow_bot_account);
                    const port = relatedAccount?.port || 0;

                    return (
                    <tr key={task.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                        {task.task_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                        {task.shadow_bot_account}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                        {task.host_ip}{port > 0 ? `:${port}` : ''}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                        {task.app_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            task.status === "running"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                              : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                          }`}
                        >
                          {task.status === "running"
                            ? "运行中"
                            : "待启动"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                        <div className="flex space-x-1">
                          {task.config_file && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded text-xs">
                              <FileText className="h-3 w-3 inline mr-1" />
                              文件
                            </span>
                          )}
                          {task.config_info && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 rounded text-xs">
                              <Settings className="h-3 w-3 inline mr-1" />
                              信息
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          {task.status === "pending" ? (
                            <button
                              onClick={() => handleStartTask(task)}
                              className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300"
                              aria-label="启动"
                            >
                              <Play className="h-4 w-4" />
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => handleStopTask(task)}
                                className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300"
                                aria-label="停止"
                                title="发送停止请求，等待确认"
                              >
                                <Square className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleForceStop(task)}
                                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                                aria-label="强制停止"
                                title="直接停止，不等待回调"
                              >
                                <Zap className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => openEditModal(task)}
                            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
                            aria-label="编辑"
                          >
                            <Settings className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openDeleteModal(task)}
                            className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                            aria-label="删除"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {filteredTasks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <TerminalSquare className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-1">暂无任务</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-4">
                {searchTerm ? `没有找到匹配 "${searchTerm}" 的任务` : "还没有创建任何任务"}
              </p>
              {!searchTerm && (
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  添加任务
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* 添加任务模态框 */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 dark:bg-slate-900/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg w-full max-w-lg border border-slate-200 dark:border-slate-700">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">添加新任务</h3>
              <button onClick={closeModals} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="task_name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    任务名称
                  </label>
                  <input
                    type="text"
                    id="task_name"
                    name="task_name"
                    className={`w-full px-4 py-2 rounded-lg border ${
                      errors.task_name
                        ? "border-red-500 dark:border-red-500 focus:ring-red-500 focus:border-red-500"
                        : "border-slate-300 dark:border-slate-700 focus:ring-indigo-500 focus:border-indigo-500"
                    } bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none`}
                    value={formData.task_name}
                    onChange={handleInputChange}
                  />
                  {errors.task_name && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.task_name}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="shadow_bot_account" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    机器人账号
                  </label>
                  <select
                    id="shadow_bot_account"
                    name="shadow_bot_account"
                    className={`w-full px-4 py-2 rounded-lg border ${
                      errors.shadow_bot_account
                        ? "border-red-500 dark:border-red-500 focus:ring-red-500 focus:border-red-500"
                        : "border-slate-300 dark:border-slate-700 focus:ring-indigo-500 focus:border-indigo-500"
                    } bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none`}
                    value={formData.shadow_bot_account}
                    onChange={(e) => {
                      handleAccountChange(e.target.value);
                    }}
                  >
                    <option value="">请选择账号</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.shadow_bot_account}>
                        {account.shadow_bot_account}
                      </option>
                    ))}
                  </select>
                  {errors.shadow_bot_account && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.shadow_bot_account}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="host_ip" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    主机IP
                  </label>
                  <input
                    type="text"
                    id="host_ip"
                    name="host_ip"
                    placeholder="192.168.1.1"
                    className={`w-full px-4 py-2 rounded-lg border ${
                      errors.host_ip
                        ? "border-red-500 dark:border-red-500 focus:ring-red-500 focus:border-red-500"
                        : "border-slate-300 dark:border-slate-700 focus:ring-indigo-500 focus:border-indigo-500"
                    } bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none`}
                    value={formData.host_ip}
                    onChange={handleInputChange}
                  />
                  {errors.host_ip && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.host_ip}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="app_name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    应用名称
                  </label>
                  <input
                    type="text"
                    id="app_name"
                    name="app_name"
                    className={`w-full px-4 py-2 rounded-lg border ${
                      errors.app_name
                        ? "border-red-500 dark:border-red-500 focus:ring-red-500 focus:border-red-500"
                        : "border-slate-300 dark:border-slate-700 focus:ring-indigo-500 focus:border-indigo-500"
                    } bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none`}
                    value={formData.app_name}
                    onChange={handleInputChange}
                  />
                  {errors.app_name && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.app_name}
                    </p>
                  )}
                </div>

                <div className="flex items-center space-x-6">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.config_file}
                      onChange={(e) => handleConfigTypeChange('file', e.target.checked)}
                      className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="ml-2 text-sm text-slate-700 dark:text-slate-300">配置文件</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.config_info}
                      onChange={(e) => handleConfigTypeChange('info', e.target.checked)}
                      className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="ml-2 text-sm text-slate-700 dark:text-slate-300">配置信息</span>
                  </label>
                </div>

                {/* 条件显示：配置文件上传 */}
                {formData.config_file && (
                  <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      上传配置文件
                    </label>
                    <input
                      type="file"
                      accept=".json,.txt,.csv,.conf,.config,.yaml,.yml"
                      onChange={handleConfigFileChange}
                      className="block w-full text-sm text-slate-500 dark:text-slate-400
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-lg file:border-0
                        file:text-sm file:font-semibold
                        file:bg-indigo-50 file:text-indigo-700
                        dark:file:bg-indigo-900/30 dark:file:text-indigo-300
                        hover:file:bg-indigo-100 dark:hover:file:bg-indigo-900/50"
                    />
                    {configFileObj && (
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                        已选择: {configFileObj.name}
                      </p>
                    )}
                    {formData.config_file_path && !configFileObj && (
                      <p className="mt-2 text-sm text-green-600 dark:text-green-400">
                        已上传: {formData.config_file_path.split('/').pop()}
                      </p>
                    )}
                    {configFileUploading && (
                      <p className="mt-2 text-sm text-indigo-600 dark:text-indigo-400 flex items-center">
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        上传中...
                      </p>
                    )}
                  </div>
                )}

                {/* 条件显示：JSON 配置输入 */}
                {formData.config_info && (
                  <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      配置信息 (JSON 格式)
                    </label>
                    <textarea
                      value={formData.config_json}
                      onChange={(e) => handleConfigJsonChange(e.target.value)}
                      placeholder='{"key": "value"}'
                      className={`w-full h-32 px-4 py-2 rounded-lg border font-mono text-sm resize-none focus:outline-none ${
                        configJsonValid
                          ? "border-slate-300 dark:border-slate-700 focus:ring-indigo-500 focus:border-indigo-500"
                          : "border-red-500 dark:border-red-500 focus:ring-red-500 focus:border-red-500"
                      } bg-white dark:bg-slate-900 text-slate-900 dark:text-white`}
                    />
                    {!configJsonValid && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                        JSON 格式不正确
                      </p>
                    )}
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      请输入有效的 JSON 格式配置信息
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end px-6 py-4 border-t border-slate-200 dark:border-slate-700 space-x-3">
              <button
                onClick={closeModals}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                disabled={submitting}
              >
                取消
              </button>
              <button
                onClick={handleAddTask}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center"
                disabled={submitting}
              >
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                添加任务
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 编辑任务模态框 */}
      {isEditModalOpen && selectedTask && (
        <div className="fixed inset-0 bg-slate-900/50 dark:bg-slate-900/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg w-full max-w-lg border border-slate-200 dark:border-slate-700">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">编辑任务</h3>
              <button onClick={closeModals} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="task_name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    任务名称
                  </label>
                  <input
                    type="text"
                    id="task_name"
                    name="task_name"
                    className={`w-full px-4 py-2 rounded-lg border ${
                      errors.task_name
                        ? "border-red-500 dark:border-red-500 focus:ring-red-500 focus:border-red-500"
                        : "border-slate-300 dark:border-slate-700 focus:ring-indigo-500 focus:border-indigo-500"
                    } bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none`}
                    value={formData.task_name}
                    onChange={handleInputChange}
                  />
                  {errors.task_name && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.task_name}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="shadow_bot_account" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    机器人账号
                  </label>
                  <select
                    id="shadow_bot_account"
                    name="shadow_bot_account"
                    className={`w-full px-4 py-2 rounded-lg border ${
                      errors.shadow_bot_account
                        ? "border-red-500 dark:border-red-500 focus:ring-red-500 focus:border-red-500"
                        : "border-slate-300 dark:border-slate-700 focus:ring-indigo-500 focus:border-indigo-500"
                    } bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none`}
                    value={formData.shadow_bot_account}
                    onChange={(e) => handleAccountChange(e.target.value)}
                  >
                    <option value="">请选择账号</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.shadow_bot_account}>
                        {account.shadow_bot_account}
                      </option>
                    ))}
                  </select>
                  {errors.shadow_bot_account && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.shadow_bot_account}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="host_ip" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    主机IP
                  </label>
                  <input
                    type="text"
                    id="host_ip"
                    name="host_ip"
                    placeholder="192.168.1.1"
                    className={`w-full px-4 py-2 rounded-lg border ${
                      errors.host_ip
                        ? "border-red-500 dark:border-red-500 focus:ring-red-500 focus:border-red-500"
                        : "border-slate-300 dark:border-slate-700 focus:ring-indigo-500 focus:border-indigo-500"
                    } bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none`}
                    value={formData.host_ip}
                    onChange={handleInputChange}
                  />
                  {errors.host_ip && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.host_ip}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="app_name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    应用名称
                  </label>
                  <input
                    type="text"
                    id="app_name"
                    name="app_name"
                    className={`w-full px-4 py-2 rounded-lg border ${
                      errors.app_name
                        ? "border-red-500 dark:border-red-500 focus:ring-red-500 focus:border-red-500"
                        : "border-slate-300 dark:border-slate-700 focus:ring-indigo-500 focus:border-indigo-500"
                    } bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none`}
                    value={formData.app_name}
                    onChange={handleInputChange}
                  />
                  {errors.app_name && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.app_name}
                    </p>
                  )}
                </div>

                <div className="flex items-center space-x-6">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.config_file}
                      onChange={(e) => handleConfigTypeChange('file', e.target.checked)}
                      className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="ml-2 text-sm text-slate-700 dark:text-slate-300">配置文件</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.config_info}
                      onChange={(e) => handleConfigTypeChange('info', e.target.checked)}
                      className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="ml-2 text-sm text-slate-700 dark:text-slate-300">配置信息</span>
                  </label>
                </div>

                {/* 条件显示：配置文件上传 */}
                {formData.config_file && (
                  <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      上传配置文件
                    </label>
                    <input
                      type="file"
                      accept=".json,.txt,.csv,.conf,.config,.yaml,.yml"
                      onChange={handleConfigFileChange}
                      className="block w-full text-sm text-slate-500 dark:text-slate-400
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-lg file:border-0
                        file:text-sm file:font-semibold
                        file:bg-indigo-50 file:text-indigo-700
                        dark:file:bg-indigo-900/30 dark:file:text-indigo-300
                        hover:file:bg-indigo-100 dark:hover:file:bg-indigo-900/50"
                    />
                    {configFileObj && (
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                        已选择: {configFileObj.name}
                      </p>
                    )}
                    {formData.config_file_path && !configFileObj && (
                      <p className="mt-2 text-sm text-green-600 dark:text-green-400">
                        已上传: {formData.config_file_path.split('/').pop()}
                      </p>
                    )}
                    {configFileUploading && (
                      <p className="mt-2 text-sm text-indigo-600 dark:text-indigo-400 flex items-center">
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        上传中...
                      </p>
                    )}
                  </div>
                )}

                {/* 条件显示：JSON 配置输入 */}
                {formData.config_info && (
                  <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      配置信息 (JSON 格式)
                    </label>
                    <textarea
                      value={formData.config_json}
                      onChange={(e) => handleConfigJsonChange(e.target.value)}
                      placeholder='{"key": "value"}'
                      className={`w-full h-32 px-4 py-2 rounded-lg border font-mono text-sm resize-none focus:outline-none ${
                        configJsonValid
                          ? "border-slate-300 dark:border-slate-700 focus:ring-indigo-500 focus:border-indigo-500"
                          : "border-red-500 dark:border-red-500 focus:ring-red-500 focus:border-red-500"
                      } bg-white dark:bg-slate-900 text-slate-900 dark:text-white`}
                    />
                    {!configJsonValid && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                        JSON 格式不正确
                      </p>
                    )}
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      请输入有效的 JSON 格式配置信息
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end px-6 py-4 border-t border-slate-200 dark:border-slate-700 space-x-3">
              <button
                onClick={closeModals}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                disabled={submitting}
              >
                取消
              </button>
              <button
                onClick={handleEditTask}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center"
                disabled={submitting}
              >
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                保存更改
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认模态框 */}
      {isDeleteModalOpen && selectedTask && (
        <div className="fixed inset-0 bg-slate-900/50 dark:bg-slate-900/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg w-full max-w-md border border-slate-200 dark:border-slate-700">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">删除任务</h3>
              <button onClick={closeModals} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-start mb-4">
                <AlertCircle className="h-5 w-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-slate-900 dark:text-white mb-1">
                    确定要删除此任务吗？
                  </h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    此操作无法撤销。删除此任务将移除所有相关数据。
                  </p>
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-700/30 p-4 rounded-lg">
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  <span className="font-medium">任务:</span> {selectedTask.task_name}
                </p>
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  <span className="font-medium">账号:</span> {selectedTask.shadow_bot_account}
                </p>
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  <span className="font-medium">应用:</span> {selectedTask.app_name}
                </p>
              </div>
            </div>
            <div className="flex justify-end px-6 py-4 border-t border-slate-200 dark:border-slate-700 space-x-3">
              <button
                onClick={closeModals}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                disabled={submitting}
              >
                取消
              </button>
              <button
                onClick={handleDeleteTask}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center"
                disabled={submitting}
              >
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                删除任务
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
