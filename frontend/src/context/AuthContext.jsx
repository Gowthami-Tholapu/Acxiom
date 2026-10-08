import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../api/axiosClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    checkCurrentUser();
  }, []);

  async function checkCurrentUser() {
    try {
      const res = await api.get("/auth/me");
      setUser(res.data);
    } catch (err) {
      setUser(null);
      localStorage.removeItem("acxiom_token");
    } finally {
      setLoading(false);
    }
  }

  async function login(email, password) {
    setAuthError(null);
    try {
      const res = await api.post("/auth/login", { email, password });
      const { access_token, user: loggedUser } = res.data;
      if (access_token) {
        localStorage.setItem("acxiom_token", access_token);
      }
      setUser(loggedUser);
      return { success: true, user: loggedUser };
    } catch (err) {
      const msg = err.userMessage || "Login failed.";
      setAuthError(msg);
      return { success: false, message: msg };
    }
  }

  async function register(name, email, password) {
    setAuthError(null);
    try {
      const res = await api.post("/auth/register", { name, email, password });
      const { access_token, user: regUser } = res.data;
      if (access_token) {
        localStorage.setItem("acxiom_token", access_token);
      }
      setUser(regUser);
      return { success: true, user: regUser };
    } catch (err) {
      const msg = err.userMessage || "Registration failed.";
      setAuthError(msg);
      return { success: false, message: msg };
    }
  }

  async function logout() {
    try {
      await api.post("/auth/logout");
    } catch (e) {
      // Ignore logout errors
    } finally {
      localStorage.removeItem("acxiom_token");
      setUser(null);
    }
  }

  const roleName = user?.role?.name || "";
  const isAdmin = roleName === "Admin";
  const isManager = roleName === "Manager";
  const isSalesExecutive = roleName === "SalesExecutive";

  const hasRole = (roles) => {
    if (!user || !user.role) return false;
    return roles.includes(user.role.name);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authError,
        setAuthError,
        login,
        register,
        logout,
        isAdmin,
        isManager,
        isSalesExecutive,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
