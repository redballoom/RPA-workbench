import { Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import AccountManagement from "@/pages/AccountManagement";
import TaskControl from "@/pages/TaskControl";
import ExecutionLogs from "@/pages/ExecutionLogs";
import Dashboard from "@/pages/Dashboard";
import { useState } from "react";
import { AuthContext } from '@/contexts/authContext';
import { Layout } from "@/components/Layout";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(true);

  const logout = () => {
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, setIsAuthenticated, logout }}
    >
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/account-management" element={<AccountManagement />} />
          <Route path="/task-control" element={<TaskControl />} />
          <Route path="/execution-logs" element={<ExecutionLogs />} />
        </Routes>
      </Layout>
    </AuthContext.Provider>
  );
}
