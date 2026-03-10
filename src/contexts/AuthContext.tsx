import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { toast } from "sonner";

export type Role = "admin" | "user";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
}

interface AuthContextType {
  currentUser: User | null;
  users: User[]; // The local DB of authorized users
  login: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  addUser: (name: string, email: string, role: Role) => void;
  removeUser: (id: string) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEFAULT_ALLOWED_USERS: User[] = [
  { id: "1", name: "Admin Manager", email: "admin@example.com", role: "admin" },
  { id: "2", name: "Team Member", email: "user@example.com", role: "user" },
  { id: "3", name: "RP Dayspring", email: "rpdedayspring@gmail.com", role: "admin" }
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>(DEFAULT_ALLOWED_USERS);
  const [isLoading, setIsLoading] = useState(true);

  // Load allowed users list & active session
  useEffect(() => {
    const savedUsers = localStorage.getItem("rpdecrew_users_v2");
    if (savedUsers) {
      try {
        setUsers(JSON.parse(savedUsers));
      } catch (e) {
        console.error(e);
      }
    } else {
      localStorage.setItem("rpdecrew_users_v2", JSON.stringify(DEFAULT_ALLOWED_USERS));
    }

    const savedSession = localStorage.getItem("rpdecrew_mock_session");
    if (savedSession) {
      try {
        const user = JSON.parse(savedSession);
        // Verify they are still in the allowed list
        const allowedUser = users.find(u => u.email.toLowerCase() === user.email.toLowerCase());
        if (allowedUser) {
          setCurrentUser(allowedUser);
        } else {
          localStorage.removeItem("rpdecrew_mock_session");
        }
      } catch (e) {
        console.error(e);
      }
    }
    
    setIsLoading(false);
  }, []);

  // Save allowed users list
  useEffect(() => {
    if (users !== DEFAULT_ALLOWED_USERS) {
      localStorage.setItem("rpdecrew_users_v2", JSON.stringify(users));
      
      // If current user was removed from list, log them out
      if (currentUser && !users.find(u => u.id === currentUser.id)) {
        logout();
        toast.error("Your access has been revoked by an administrator.");
      }
    }
  }, [users, currentUser]);

  const login = async (email: string) => {
    // Check local whitelist
    const allowedUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (!allowedUser) {
      toast.error("User not found in the authorized list. Contact an admin.");
      return;
    }

    // Simulate network request
    await new Promise(resolve => setTimeout(resolve, 600));
    
    setCurrentUser(allowedUser);
    localStorage.setItem("rpdecrew_mock_session", JSON.stringify(allowedUser));
    toast.success(`Welcome back, ${allowedUser.name}!`);
  };

  const logout = async () => {
    setCurrentUser(null);
    localStorage.removeItem("rpdecrew_mock_session");
    toast.info("Logged out successfully");
  };

  const addUser = (name: string, email: string, role: Role) => {
    if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      toast.error("User with this email already exists");
      return;
    }
    const newUser: User = {
      id: Date.now().toString(),
      name,
      email,
      role,
    };
    setUsers((prev) => [...prev, newUser]);
    toast.success("User added successfully");
  };

  const removeUser = (id: string) => {
    if (currentUser?.id === id) {
      toast.error("You cannot delete your own account");
      return;
    }
    setUsers((prev) => prev.filter((u) => u.id !== id));
    toast.success("User removed");
  };

  return (
    <AuthContext.Provider value={{ currentUser, users, login, logout, addUser, removeUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
