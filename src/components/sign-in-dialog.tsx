
"use client";

import { useState } from "react";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile,
  AuthError,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type SignInDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  title?: string;
  description?: string;
};

type View = "SIGN_IN" | "SIGN_UP";

export function SignInDialog({ 
  isOpen, 
  onOpenChange,
  title = "Welcome",
  description = "Sign in or create an account to continue."
}: SignInDialogProps) {
  const [view, setView] = useState<View>("SIGN_IN");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleAuthError = (err: AuthError) => {
    switch (err.code) {
      case "auth/invalid-email":
        return "Please enter a valid email address.";
      case "auth/user-not-found":
      case "auth/wrong-password":
      case "auth/invalid-credential":
        return "Invalid email or password. Please try again.";
      case "auth/email-already-in-use":
        return "An account with this email already exists.";
      case "auth/weak-password":
        return "Password should be at least 6 characters long.";
      default:
        return "An unexpected error occurred. Please try again.";
    }
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      onOpenChange(false);
    } catch (err) {
      setError(handleAuthError(err as AuthError));
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    if (!displayName.trim()) {
        setError("Please enter a display name.");
        setLoading(false);
        return;
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      if (userCredential.user) {
        await updateProfile(userCredential.user, { displayName });
      }
      toast({
        title: "Account Created!",
        description: "You have successfully signed up.",
      })
      onOpenChange(false);
    } catch (err) {
      setError(handleAuthError(err as AuthError));
    } finally {
      setLoading(false);
    }
  };
  
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setEmail("");
      setPassword("");
      setDisplayName("");
      setError(null);
      setView("SIGN_IN");
    }
    onOpenChange(open);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-headline text-center">{view === 'SIGN_IN' ? "Sign In" : "Create Account"}</DialogTitle>
          <DialogDescription className="text-center">
            {description}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={view === 'SIGN_IN' ? handleSignIn : handleSignUp}>
          <div className="grid gap-4 py-4">
            {view === 'SIGN_UP' && (
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input 
                  id="displayName" 
                  value={displayName} 
                  onChange={(e) => setDisplayName(e.target.value)} 
                  placeholder="John Doe"
                  required 
                />
              </div>
            )}
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
          </div>

          <DialogFooter className="flex-col gap-2">
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Loading..." : (view === 'SIGN_IN' ? "Sign In" : "Create Account")}
            </Button>
            <Button 
              type="button" 
              variant="link" 
              size="sm" 
              onClick={() => setView(view === 'SIGN_IN' ? 'SIGN_UP' : 'SIGN_IN')}
              className="text-muted-foreground"
            >
              {view === 'SIGN_IN' ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
            </Button>
          </DialogFooter>
        </form>

      </DialogContent>
    </Dialog>
  );
}
