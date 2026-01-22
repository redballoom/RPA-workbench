import { useState, useEffect } from "react";
import { Users, Plus, Edit, Trash2, Search, X, AlertCircle, Loader2, Wifi } from "lucide-react";
import { toast } from "sonner";
import { accountsApi, Account, ApiError } from "../lib/api";
import { useSSE, SSEEvent } from "../hooks/useSSE";

export default function AccountManagement() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

  const [formData, setFormData] = useState({
    shadow_bot_account: "",
    host_ip: "",
    task_control: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);


  const {
    // SSE 连接
    connected,
    connectionState,
    subscribe
  } = useSSE({
    autoReconnect: true,
    heartbeat: true,
  });

  // 加载账号列表
  const loadAccounts = async (search?: string) => {
    try {
      setLoading(true);
      const response = await accountsApi.getAccounts({
        search: search || searchTerm,
        page: 1,
        page_size: 100,
      });
      setAccounts(response.items || []);
    } catch (error) {
      console.error('Failed to load accounts:', error);
      if (error instanceof ApiError) {
        toast.error(`加载失败: ${error.message}`);
      } else {
        toast.error('加载账号列表失败');
      }
    } finally {
      setLoading(false);
    }
  };

  // SSE 事件处理
  useEffect(() => {
    // 账号更新事件
    const unsubAccount = subscribe('account_updated', (event: SSEEvent) => {
      console.log('[账号管理] 收到账号更新事件:', event.data);
      // 刷新账号列表
      loadAccounts();
      toast.info('账号状态已更新', {
        description: event.data.changes?.recent_app
          ? `最近应用: ${event.data.changes.recent_app}`
          : undefined,
      });
    });

    // 日志创建事件（可能影响账号状态）
    const unsubLog = subscribe('log_created', (event: SSEEvent) => {
      console.log('[账号管理] 收到日志创建事件:', event.data);
      // 刷新账号列表（更新最近应用、状态等）
      loadAccounts();
    });

    return () => {
      unsubAccount();
      unsubLog();
    };
  }, [subscribe]);

  // 初始加载
  useEffect(() => {
    loadAccounts();
  }, []);

  const filteredAccounts = accounts.filter(
    (account) =>
      account.shadow_bot_account.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.host_ip.includes(searchTerm) ||
      account.task_control.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.shadow_bot_account.trim()) {
      newErrors.shadow_bot_account = "机器人账号名称不能为空";
    }

    if (!formData.host_ip.trim()) {
      newErrors.host_ip = "主机IP不能为空";
    } else if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(formData.host_ip)) {
      newErrors.host_ip = "IP地址格式不正确";
    }

    if (!formData.task_control.trim()) {
      newErrors.task_control = "任务控制标识不能为空";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // 清除对应字段的错误
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const handleAddAccount = async () => {
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      await accountsApi.createAccount({
        shadow_bot_account: formData.shadow_bot_account,
        host_ip: formData.host_ip,
        task_control: formData.task_control,
      });

      toast.success("账号创建成功");
      setIsAddModalOpen(false);
      resetForm();
      loadAccounts();
    } catch (error) {
      console.error('Failed to create account:', error);
      if (error instanceof ApiError) {
        toast.error(`创建失败: ${error.message}`);
      } else {
        toast.error('创建账号失败');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditAccount = async () => {
    if (!selectedAccount || !validateForm()) return;

    try {
      setSubmitting(true);
      await accountsApi.updateAccount(selectedAccount.id, {
        shadow_bot_account: formData.shadow_bot_account,
        host_ip: formData.host_ip,
        task_control: formData.task_control,
      });

      toast.success("账号更新成功");
      setIsEditModalOpen(false);
      setSelectedAccount(null);
      resetForm();
      loadAccounts();
    } catch (error) {
      console.error('Failed to update account:', error);
      if (error instanceof ApiError) {
        toast.error(`更新失败: ${error.message}`);
      } else {
        toast.error('更新账号失败');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!selectedAccount) return;

    try {
      setSubmitting(true);
      await accountsApi.deleteAccount(selectedAccount.id);

      toast.success("账号删除成功");
      setIsDeleteModalOpen(false);
      setSelectedAccount(null);
      loadAccounts();
    } catch (error) {
      console.error('Failed to delete account:', error);
      if (error instanceof ApiError) {
        toast.error(`删除失败: ${error.message}`);
      } else {
        toast.error('删除账号失败');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (account: Account) => {
    setSelectedAccount(account);
    setFormData({
      shadow_bot_account: account.shadow_bot_account,
      host_ip: account.host_ip,
      task_control: account.task_control,
    });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (account: Account) => {
    setSelectedAccount(account);
    setIsDeleteModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      shadow_bot_account: "",
      host_ip: "",
      task_control: "",
    });
    setErrors({});
  };

  const closeModals = () => {
    setIsAddModalOpen(false);
    setIsEditModalOpen(false);
    setIsDeleteModalOpen(false);
    setSelectedAccount(null);
    resetForm();
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    loadAccounts(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <Users className="h-6 w-6 text-indigo-600 dark:text-indigo-400 mr-2" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">账号管理</h1>
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
              placeholder="搜索账号..."
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
            添加账号
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
                      机器人账号
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      主机IP
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      状态
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      最近应用
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      结束时间
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      任务控制
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      绑定任务数
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {filteredAccounts.map((account) => (
                    <tr key={account.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                        {account.shadow_bot_account}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                        {account.host_ip}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            account.status === "completed"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                              : account.status === "running"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                              : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                          }`}
                        >
                          {account.status === "completed"
                            ? "已完成"
                            : account.status === "running"
                            ? "运行中"
                            : "待启动"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                        {account.recent_app || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                        {account.end_time ? new Date(account.end_time).toLocaleString() : "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                        {account.task_control}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300">
                          {account.task_count || 0} 个任务
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => openEditModal(account)}
                          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 mr-3"
                          aria-label="编辑"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openDeleteModal(account)}
                          className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                          aria-label="删除"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {filteredAccounts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <Users className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-1">暂无账号</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-4">
                {searchTerm
                  ? `没有找到匹配 "${searchTerm}" 的账号`
                  : "还没有添加任何账号"}
              </p>
              {!searchTerm && (
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  添加账号
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* 添加账号模态框 */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 dark:bg-slate-900/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg w-full max-w-md border border-slate-200 dark:border-slate-700">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">添加新账号</h3>
              <button onClick={closeModals} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="shadow_bot_account" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    机器人账号名称
                  </label>
                  <input
                    type="text"
                    id="shadow_bot_account"
                    name="shadow_bot_account"
                    className={`w-full px-4 py-2 rounded-lg border ${
                      errors.shadow_bot_account
                        ? "border-red-500 dark:border-red-500 focus:ring-red-500 focus:border-red-500"
                        : "border-slate-300 dark:border-slate-700 focus:ring-indigo-500 focus:border-indigo-500"
                    } bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none`}
                    value={formData.shadow_bot_account}
                    onChange={handleInputChange}
                  />
                  {errors.shadow_bot_account && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.shadow_bot_account}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="host_ip" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    主机IP地址
                  </label>
                  <input
                    type="text"
                    id="host_ip"
                    name="host_ip"
                    placeholder="例如: 192.168.1.1"
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
                  <label htmlFor="task_control" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    任务控制标识
                  </label>
                  <input
                    type="text"
                    id="task_control"
                    name="task_control"
                    placeholder="例如: account_name--192.168.1...."
                    className={`w-full px-4 py-2 rounded-lg border ${
                      errors.task_control
                        ? "border-red-500 dark:border-red-500 focus:ring-red-500 focus:border-red-500"
                        : "border-slate-300 dark:border-slate-700 focus:ring-indigo-500 focus:border-indigo-500"
                    } bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none`}
                    value={formData.task_control}
                    onChange={handleInputChange}
                  />
                  {errors.task_control && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.task_control}
                    </p>
                  )}
                </div>
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
                onClick={handleAddAccount}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center"
                disabled={submitting}
              >
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                添加账号
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 编辑账号模态框 */}
      {isEditModalOpen && selectedAccount && (
        <div className="fixed inset-0 bg-slate-900/50 dark:bg-slate-900/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg w-full max-w-md border border-slate-200 dark:border-slate-700">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">编辑账号</h3>
              <button onClick={closeModals} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="shadow_bot_account" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    机器人账号名称
                  </label>
                  <input
                    type="text"
                    id="shadow_bot_account"
                    name="shadow_bot_account"
                    className={`w-full px-4 py-2 rounded-lg border ${
                      errors.shadow_bot_account
                        ? "border-red-500 dark:border-red-500 focus:ring-red-500 focus:border-red-500"
                        : "border-slate-300 dark:border-slate-700 focus:ring-indigo-500 focus:border-indigo-500"
                    } bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none`}
                    value={formData.shadow_bot_account}
                    onChange={handleInputChange}
                  />
                  {errors.shadow_bot_account && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.shadow_bot_account}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="host_ip" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    主机IP地址
                  </label>
                  <input
                    type="text"
                    id="host_ip"
                    name="host_ip"
                    placeholder="例如: 192.168.1.1"
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
                  <label htmlFor="task_control" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    任务控制标识
                  </label>
                  <input
                    type="text"
                    id="task_control"
                    name="task_control"
                    placeholder="例如: account_name--192.168.1...."
                    className={`w-full px-4 py-2 rounded-lg border ${
                      errors.task_control
                        ? "border-red-500 dark:border-red-500 focus:ring-red-500 focus:border-red-500"
                        : "border-slate-300 dark:border-slate-700 focus:ring-indigo-500 focus:border-indigo-500"
                    } bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none`}
                    value={formData.task_control}
                    onChange={handleInputChange}
                  />
                  {errors.task_control && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.task_control}
                    </p>
                  )}
                </div>
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
                onClick={handleEditAccount}
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
      {isDeleteModalOpen && selectedAccount && (
        <div className="fixed inset-0 bg-slate-900/50 dark:bg-slate-900/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg w-full max-w-md border border-slate-200 dark:border-slate-700">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">删除账号</h3>
              <button onClick={closeModals} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-start mb-4">
                <AlertCircle className="h-5 w-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-slate-900 dark:text-white mb-1">
                    确定要删除此账号吗？
                  </h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    此操作无法撤销。删除此账号将移除所有相关数据。
                  </p>
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-700/30 p-4 rounded-lg">
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  <span className="font-medium">账号:</span> {selectedAccount.shadow_bot_account}
                </p>
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  <span className="font-medium">主机IP:</span> {selectedAccount.host_ip}
                </p>
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  <span className="font-medium">绑定任务数:</span> {selectedAccount.task_count || 0} 个
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
                onClick={handleDeleteAccount}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center"
                disabled={submitting}
              >
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                删除账号
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
