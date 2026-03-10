import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert, LogIn } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, users } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSubmitting(true);
    try {
      await login(email);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <Card className="border-border shadow-lg">
          <CardHeader className="space-y-1">
            <div className="flex justify-center mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold">
                W
              </div>
            </div>
            <CardTitle className="text-2xl text-center font-bold tracking-tight">Welcome Back</CardTitle>
            <CardDescription className="text-center">Sign in to the Team Workforce dashboard.</CardDescription>
          </CardHeader>
          
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
              </div>
              
              <div className="bg-primary/5 p-3 rounded-lg border border-primary/10 text-xs text-muted-foreground flex gap-2">
                <ShieldAlert className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <p className="font-semibold text-foreground mb-1">Authorized Users:</p>
                  <p className="mb-2">Click an email below to log in instantly (Local Demo Mode).</p>
                  <ul className="list-disc list-inside space-y-1">
                    {users.slice(0, 5).map((u) => (
                      <li key={u.id} className="cursor-pointer hover:text-primary transition-colors truncate" onClick={() => setEmail(u.email)}>
                        {u.email} ({u.role})
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={isSubmitting || !email}>
                {isSubmitting ? (
                  <span className="flex items-center gap-2">Signing in...</span>
                ) : (
                  <><LogIn className="mr-2 h-4 w-4" /> Sign In</>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}