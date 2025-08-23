
"use client";

import { useState, useEffect } from "react";
import { signInWithEmailAndPassword, onAuthStateChanged, User, AuthError } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/header";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { KeyRound } from "lucide-react";
import { SignInDialog } from "@/components/sign-in-dialog";

export default function StudentLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [isSignInOpen, setSignInOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Redirect if user is already logged in
        router.push('/');
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleAuthError = (err: AuthError) => {
    switch (err.code) {
      case "auth/invalid-email":
        return "Please enter a valid email address.";
      case "auth/user-not-found":
      case "auth/wrong-password":
      case "auth/invalid-credential":
        return "Invalid email or password. Please try again.";
      default:
        return "An unexpected error occurred. Please try again.";
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({
        title: "Login Successful",
        description: "Welcome back!",
      });
      router.push('/');
    } catch (err) {
      setError(handleAuthError(err as AuthError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header
        user={user}
        onSignInClick={() => setSignInOpen(true)}
      />
      <main className="container mx-auto px-4 py-8 flex justify-center items-center" style={{ minHeight: 'calc(100vh - 80px)' }}>
        <Card className="w-full max-w-sm">
          <form onSubmit={handleSignIn}>
            <CardHeader>
              <CardTitle className="font-headline text-2xl text-center">Student Login</CardTitle>
              <CardDescription className="text-center">
                Enter your credentials to access the dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {error && <p className="text-sm text-center text-destructive">{error}</p>}
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Signing In..." : "Sign In"}
                {!loading && <KeyRound className="ml-2 h-4 w-4" />}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </main>
      <SignInDialog
        isOpen={isSignInOpen}
        onOpenChange={setSignInOpen}
      />
    </>
  );
}
