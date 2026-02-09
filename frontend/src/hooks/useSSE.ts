/**
 * SSE (Server-Sent Events) Hook
 * 用于实时接收后端推送的事件
 *
 * 支持的事件类型:
 * - log_created: 新建执行日志
 * - account_updated: 账号状态变更
 * - task_updated: 任务状态变更
 * - heartbeat: 心跳保活
 */

import { useEffect, useCallback, useState, useRef } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
if (!API_BASE_URL) {
  throw new Error('VITE_API_BASE_URL 环境变量未设置，请检查 .env 文件');
}

export interface SSEEvent {
  type: 'log_created' | 'account_updated' | 'task_updated' | 'heartbeat' | 'message';
  data: Record<string, unknown>;
  timestamp?: string;
}

interface UseSSEOptions {
  /** 是否自动重连 */
  autoReconnect?: boolean;
  /** 重连间隔（毫秒） */
  reconnectInterval?: number;
  /** 最大重连次数 */
  maxReconnectAttempts?: number;
  /** 是否启用心跳 */
  heartbeat?: boolean;
  /** 心跳间隔（毫秒） */
  heartbeatInterval?: number;
}

interface UseSSEReturn {
  /** 连接状态 */
  connected: boolean;
  /** 连接状态文本 */
  connectionState: 'connecting' | 'connected' | 'disconnected' | 'error';
  /** 错误信息 */
  error: Error | null;
  /** 手动重连 */
  reconnect: () => void;
  /** 手动断开连接 */
  disconnect: () => void;
  /** 订阅事件 */
  subscribe: (eventType: SSEEvent['type'], callback: (event: SSEEvent) => void) => () => void;
}

export function useSSE(options: UseSSEOptions = {}): UseSSEReturn {
  const {
    autoReconnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
    heartbeat = true,
    heartbeatInterval = 30000,
  } = options;

  const [connected, setConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<UseSSEReturn['connectionState']>('disconnected');
  const [error, setError] = useState<Error | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const listenersRef = useRef<Map<string, Set<(event: SSEEvent) => void>>>(new Map());

  // 清除心跳定时器
  const clearHeartbeat = useCallback(() => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
  }, []);

  // 启动心跳
  const startHeartbeat = useCallback(() => {
    if (!heartbeat) return;

    clearHeartbeat();
    heartbeatTimerRef.current = setInterval(() => {
      // 心跳由 SSE 协议自动处理，这里主要用于保持连接活跃
      // 如果需要手动心跳，可以在这里发送请求
    }, heartbeatInterval);
  }, [heartbeat, heartbeatInterval, clearHeartbeat]);

  // 建立连接
  const connect = useCallback(() => {
    // 如果已连接，先断开
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setConnectionState('connecting');
    setError(null);

    try {
      const eventSource = new EventSource(`${API_BASE_URL}/sse/events`);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setConnected(true);
        setConnectionState('connected');
        setError(null);
        reconnectAttemptsRef.current = 0;
        startHeartbeat();
        // console.log('[SSE] 连接已建立');
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as SSEEvent;
          // 通知所有监听器
          const listeners = listenersRef.current.get(data.type) || new Set();
          listeners.forEach((callback) => {
            try {
              callback(data);
            } catch (callbackError) {
              console.error('[SSE] 回调执行错误:', callbackError);
            }
          });

          // 同时通知通用监听器
          const generalListeners = listenersRef.current.get('message') || new Set();
          generalListeners.forEach((callback) => {
            try {
              callback(data);
            } catch (callbackError) {
              console.error('[SSE] 通用回调执行错误:', callbackError);
            }
          });
        } catch (parseError) {
          console.error('[SSE] 解析事件数据错误:', parseError);
        }
      };

      eventSource.addEventListener('log_created', (event) => {
        const data = JSON.parse((event as MessageEvent).data);
        notifyListeners('log_created', data);
      });

      eventSource.addEventListener('account_updated', (event) => {
        const data = JSON.parse((event as MessageEvent).data);
        notifyListeners('account_updated', data);
      });

      eventSource.addEventListener('task_updated', (event) => {
        const data = JSON.parse((event as MessageEvent).data);
        notifyListeners('task_updated', data);
      });

      eventSource.addEventListener('heartbeat', (event) => {
        // 心跳事件，只需保持连接
        console.log('[SSE] 心跳接收');
      });

      eventSource.onerror = (err) => {
        console.error('[SSE] 连接错误:', err);
        setConnected(false);
        setConnectionState('error');
        setError(new Error('SSE 连接断开'));

        // 清除心跳
        clearHeartbeat();

        // 关闭连接
        eventSource.close();
        eventSourceRef.current = null;

        // 自动重连
        if (autoReconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          console.log(`[SSE] 准备重连 (${reconnectAttemptsRef.current}/${maxReconnectAttempts})...`);
          setTimeout(connect, reconnectInterval);
        } else {
          setConnectionState('disconnected');
          console.error('[SSE] 重连次数已用完');
        }
      };
    } catch (err) {
      console.error('[SSE] 创建连接错误:', err);
      setError(err instanceof Error ? err : new Error('创建 SSE 连接失败'));
      setConnectionState('error');
    }
  }, [autoReconnect, heartbeat, heartbeatInterval, maxReconnectAttempts, reconnectInterval, startHeartbeat, clearHeartbeat]);

  // 通知监听器
  const notifyListeners = useCallback((eventType: string, data: Record<string, unknown>) => {
    const listeners = listenersRef.current.get(eventType) || new Set();
    listeners.forEach((callback) => {
      try {
        callback({
          type: eventType as SSEEvent['type'],
          data,
          timestamp: new Date().toISOString(),
        });
      } catch (callbackError) {
        console.error(`[SSE] ${eventType} 回调执行错误:`, callbackError);
      }
    });
  }, []);

  // 订阅事件
  const subscribe = useCallback((eventType: SSEEvent['type'], callback: (event: SSEEvent) => void) => {
    if (!listenersRef.current.has(eventType)) {
      listenersRef.current.set(eventType, new Set());
    }
    listenersRef.current.get(eventType)!.add(callback);

    // 返回取消订阅函数
    return () => {
      const listeners = listenersRef.current.get(eventType);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          listenersRef.current.delete(eventType);
        }
      }
    };
  }, []);

  // 手动重连
  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    connect();
  }, [connect]);

  // 手动断开
  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    clearHeartbeat();
    setConnected(false);
    setConnectionState('disconnected');
    // console.log('[SSE] 连接已断开');
  }, [clearHeartbeat]);

  // 组件挂载时自动连接
  useEffect(() => {
    connect();

    // 清理函数
    return () => {
      disconnect();
    };
  }, []);

  return {
    connected,
    connectionState,
    error,
    reconnect,
    disconnect,
    subscribe,
  };
}

export default useSSE;
