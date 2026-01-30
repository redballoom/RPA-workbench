/**
 * API客户端 - 统一处理所有API调用
 * 基于最新API文档: /doc/new_api.md
 *
 * 资源加载使用 HTTP 缓存（后端 Cache-Control: max-age=1296000，即15天）
 * 浏览器会自动缓存图片和日志内容，减少 OSS 请求流量
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

// 通用API响应类型
interface ApiResponse<T> {
  items?: T[];
  total?: number;
  page?: number;
  page_size?: number;
  total_pages?: number;
  [key: string]: any;
}

// 数据类型定义（snake_case，与后端API一致）
export interface Account {
  id: string;
  shadow_bot_account: string;
  host_ip: string;
  port: number;  // 连接端口
  recent_app?: string | null;
  status: 'pending' | 'completed' | 'failed' | 'running';
  end_time?: string | null;
  task_control: string;
  task_count: number;  // 绑定任务数
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  task_name: string;
  shadow_bot_account: string;
  host_ip: string;
  app_name: string;
  last_run_time?: string | null;
  status: 'pending' | 'running';
  config_file: boolean;
  config_info: boolean;
  config_file_path?: string | null;  // 配置文件 OSS URL
  config_json?: string | null;        // 配置信息 JSON
  trigger_time?: string | null;
  account_port?: number;  // 从关联账号获取的端口
  created_at: string;
  updated_at: string;
}

export interface ExecutionLog {
  id: string;
  text: string;
  app_name: string;
  shadow_bot_account: string;
  status: 'completed' | 'failed';
  start_time: string;
  end_time: string;
  duration: number;
  host_ip: string;
  log_info: boolean;
  screenshot: boolean;
  // 资源路径（本地或云端 URL）
  screenshot_path?: string | null;  // 截图文件路径/URL
  log_content?: string | null;      // 详细日志内容（本地）或日志 URL（云端）
  created_at: string;
}

// 获取资源完整 URL（支持本地路径和云端 URL）
// 云端资源通过后端代理访问，支持浏览器 HTTP 缓存（15天）
export function getResourceUrl(path?: string | null): string {
  if (!path) return '';

  // 如果是完整的云端 URL（http/https），使用后端代理
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return `${API_BASE_URL}/resources/proxy?url=${encodeURIComponent(path)}`;
  }

  // 如果是本地路径，添加本地服务器地址
  // path 格式: "/static/uploads/screenshots/2026/01/27/xxx.png"
  return path.startsWith('/') ? `http://localhost:8000${path}` : path;
}

// 获取资源下载 URL（不缓存，确保获取最新版本）
export function getDownloadUrl(path?: string | null): string {
  if (!path) return '';

  // 如果是完整的云端 URL（http/https），使用下载代理
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return `${API_BASE_URL}/resources/proxy/download?url=${encodeURIComponent(path)}`;
  }

  // 如果是本地路径，添加本地服务器地址
  return path.startsWith('/') ? `http://localhost:8000${path}` : path;
}

// 兼容旧函数名
export const getScreenshotUrl = getResourceUrl;

export interface DashboardStats {
  accounts: {
    total: number;
    by_status: {
      pending: number;
      completed: number;
      running: number;
    };
  };
  tasks: {
    total: number;
    by_status: {
      pending: number;
      completed: number;
      running: number;
      failed: number;
    };
  };
  execution_logs: {
    total: number;
    by_status: {
      completed: number;
      failed: number;
      running: number;
    };
    success_rate: number;
  };
  generated_at: string;
}

export interface PerformanceTrends {
  period: string;
  dailyStats: Array<{
    date: string;
    totalExecutions: number;
    completed: number;
    failed: number;
    avgDuration: number;
  }>;
  totalExecutions: number;
  completionRate: number;
  avgDuration: number;
}

export interface ExecutionRank {
  app_name: string;
  avg_duration: number;
  execution_count: number;
}

export interface ExecutionRankResponse {
  items: ExecutionRank[];
  generated_at: string;
}

// API错误处理类
class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// 通用请求方法
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.message || errorData.detail?.message || 'API请求失败',
        response.status,
        errorData
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error instanceof Error ? error.message : '网络请求失败',
      0
    );
  }
}

// ==================== 账号管理 API ====================

export const accountsApi = {
  // 获取账号列表
  async getAccounts(params?: {
    search?: string;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<Account>> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.append('search', params.search);
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.page_size) searchParams.append('page_size', params.page_size.toString());

    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return request<ApiResponse<Account>>(`/accounts${query}`);
  },

  // 获取单个账号
  async getAccount(id: string): Promise<Account> {
    return request<Account>(`/accounts/${id}`);
  },

  // 创建账号
  async createAccount(data: {
    shadow_bot_account: string;
    host_ip: string;
    port: number;
  }): Promise<Account> {
    return request<Account>('/accounts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // 更新账号
  async updateAccount(
    id: string,
    data: Partial<{
      shadow_bot_account: string;
      host_ip: string;
      port: number;
    }>
  ): Promise<Account> {
    return request<Account>(`/accounts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // 删除账号
  async deleteAccount(id: string): Promise<{ message: string; code: string }> {
    return request<{ message: string; code: string }>(`/accounts/${id}`, {
      method: 'DELETE',
    });
  },
};

// ==================== 任务管理 API ====================

export const tasksApi = {
  // 获取任务列表
  async getTasks(params?: {
    search?: string;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<Task>> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.append('search', params.search);
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.page_size) searchParams.append('page_size', params.page_size.toString());

    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return request<ApiResponse<Task>>(`/tasks${query}`);
  },

  // 获取单个任务
  async getTask(id: string): Promise<Task> {
    return request<Task>(`/tasks/${id}`);
  },

  // 创建任务
  async createTask(data: {
    task_name: string;
    shadow_bot_account: string;
    host_ip: string;
    app_name: string;
    config_file?: boolean;
    config_info?: boolean;
    config_file_path?: string;
    config_json?: string;
  }): Promise<Task> {
    return request<Task>('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // 更新任务
  async updateTask(
    id: string,
    data: Partial<{
      task_name: string;
      shadow_bot_account: string;
      host_ip: string;
      app_name: string;
      config_file: boolean;
      config_info: boolean;
      config_file_path?: string;
      config_json?: string;
    }>
  ): Promise<Task> {
    return request<Task>(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // 删除任务
  async deleteTask(id: string): Promise<{ message: string; code: string }> {
    return request<{ message: string; code: string }>(`/tasks/${id}`, {
      method: 'DELETE',
    });
  },

  // 启动任务
  async startTask(id: string): Promise<{
    success: boolean;
    message: string;
    task_id: string;
    status: string;
  }> {
    return request<{
      success: boolean;
      message: string;
      task_id: string;
      status: string;
    }>(`/tasks/${id}/start`, {
      method: 'POST',
    });
  },

  // 停止任务
  async stopTask(id: string): Promise<{
    success: boolean;
    message: string;
    task_id: string;
    status: string;
  }> {
    return request<{
      success: boolean;
      message: string;
      task_id: string;
      status: string;
    }>(`/tasks/${id}/stop`, {
      method: 'POST',
    });
  },
};

// ==================== 执行日志 API ====================

export const logsApi = {
  // 获取日志列表
  async getLogs(params?: {
    search?: string;
    status?: string;
    page?: number;
    page_size?: number;
    sort_by?: string;      // 排序字段: start_time, created_at, duration
    order?: "asc" | "desc"; // 排序方向
  }): Promise<ApiResponse<ExecutionLog>> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.append('search', params.search);
    if (params?.status) searchParams.append('status', params.status);
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.page_size) searchParams.append('page_size', params.page_size.toString());
    if (params?.sort_by) searchParams.append('sort_by', params.sort_by);
    if (params?.order) searchParams.append('order', params.order);

    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return request<ApiResponse<ExecutionLog>>(`/logs${query}`);
  },

  // 导出日志
  async exportLogs(): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/logs/export`);
    if (!response.ok) {
      throw new ApiError('导出日志失败', response.status);
    }
    return response.blob();
  },
};

// ==================== 仪表盘 API ====================

export const dashboardApi = {
  // 获取统计数据
  async getStats(): Promise<DashboardStats> {
    return request<DashboardStats>('/dashboard/stats');
  },

  // 获取性能趋势
  async getPerformance(days: number = 7): Promise<PerformanceTrends> {
    return request<PerformanceTrends>(`/dashboard/performance?days=${days}`);
  },

  // 获取执行时间排行榜
  async getExecutionRank(limit: number = 10): Promise<ExecutionRankResponse> {
    return request<ExecutionRankResponse>(`/dashboard/execution-rank?limit=${limit}`);
  },
};

// ==================== Webhook API ====================

export const webhookApi = {
  // 执行完成回调
  async executionComplete(data: {
    shadow_bot_account: string;
    app_name: string;
    status: string;
    start_time: string;
    end_time: string;
    duration_seconds: number;
    result_summary?: {
      total_items: number;
      success_items: number;
      failed_items: number;
      error_message?: string;
    };
    log_info: boolean;
    screenshot: boolean;
  }): Promise<{
    success: boolean;
    message: string;
    log_id: string;
  }> {
    return request<{
      success: boolean;
      message: string;
      log_id: string;
    }>('/webhook/execution-complete', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // 心跳检测
  async heartbeat(params: {
    shadow_bot_account: string;
    app_name: string;
  }): Promise<{
    success: boolean;
    message: string;
  }> {
    const searchParams = new URLSearchParams({
      shadow_bot_account: params.shadow_bot_account,
      app_name: params.app_name,
    });

    return request<{
      success: boolean;
      message: string;
    }>(`/webhook/heartbeat?${searchParams.toString()}`, {
      method: 'POST',
    });
  },
};

// ==================== 系统服务 API ====================

export const systemApi = {
  // 健康检查
  async healthCheck(): Promise<{
    status: string;
    database: string;
    version: string;
    sse: string;
  }> {
    return request<{
      status: string;
      database: string;
      version: string;
      sse: string;
    }>('/health');
  },

  // 获取API信息
  async getApiInfo(): Promise<{
    message: string;
    version: string;
    docs: string;
  }> {
    return request<{
      message: string;
      version: string;
      docs: string;
    }>('/');
  },
};

// 导出ApiError供外部使用
export { ApiError };
