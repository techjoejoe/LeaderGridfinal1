
"use client";

import { useState } from "react";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile,
  AuthError,
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
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
import type { UserData } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


type SignInDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  title?: string;
  description?: string;
};


export function SignInDialog({ 
  isOpen, 
  onOpenChange,
  title = "Welcome",
  description = "Sign in or create an account to continue."
}: SignInDialogProps) {
  const [view, setView] = useState<'trainer' | 'student' | 'manager'>('trainer');
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
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
      if (!userDoc.exists() || (userDoc.data() as UserData).role !== view) {
        await auth.signOut();
        setError(`This login is for ${view}s only.`);
        return;
      }
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
        const userData: UserData = {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          displayName: displayName,
          role: view,
        };
        if (view === 'student') userData.classIds = [];
        if (view === 'manager') userData.managedTrainerUids = [];

        await setDoc(doc(db, "users", userCredential.user.uid), userData);
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
    }
    onOpenChange(open);
  }

  const renderForm = (isSignUp: boolean) => (
     <form onSubmit={isSignUp ? handleSignUp : handleSignIn}>
        <div className="grid gap-4 py-4">
        {isSignUp && (
            <div className="space-y-2">
            <Label htmlFor={`${view}-displayName`}>Display Name</Label>
            <Input 
                id={`${view}-displayName`} 
                value={displayName} 
                onChange={(e) => setDisplayName(e.target.value)} 
                placeholder="John Doe"
                required 
            />
            </div>
        )}
        <div className="space-y-2">
            <Label htmlFor={`${view}-email`}>Email</Label>
            <Input 
            id={`${view}-email`} 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            placeholder="you@example.com" 
            required 
            />
        </div>
        <div className="space-y-2">
            <Label htmlFor={`${view}-password`}>Password</Label>
            <Input 
            id={`${view}-password`} 
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
            {loading ? "Loading..." : (isSignUp ? "Create Account" : "Sign In")}
        </Button>
        </DialogFooter>
    </form>
  )

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-headline text-center">{title}</DialogTitle>
          <DialogDescription className="text-center">
            {description}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={view} onValueChange={(v) => { setView(v as any); setError(null); }} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="trainer">Trainer</TabsTrigger>
                <TabsTrigger value="student">Student</TabsTrigger>
                <TabsTrigger value="manager">Manager</TabsTrigger>
            </TabsList>
            <TabsContent value="trainer">
                <Tabs defaultValue="signin" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="signin">Sign In</TabsTrigger>
                        <TabsTrigger value="signup">Sign Up</TabsTrigger>
                    </TabsList>
                    <TabsContent value="signin">{renderForm(false)}</TabsContent>
                    <TabsContent value="signup">{renderForm(true)}</TabsContent>
                </Tabs>
            </TabsContent>
            <TabsContent value="student">
                <Tabs defaultValue="signin" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="signin">Sign In</TabsTrigger>
                        <TabsTrigger value="signup">Sign Up</TabsTrigger>
                    </TabsList>
                    <TabsContent value="signin">{renderForm(false)}</TabsContent>
                    <TabsContent value="signup">{renderForm(true)}</TabsContent>
                </Tabs>
            </TabsContent>
            <TabsContent value="manager">
                <Tabs defaultValue="signin" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="signin">Sign In</TabsTrigger>
                        <TabsTrigger value="signup">Sign Up</TabsTrigger>
                    </TabsList>
                    <TabsContent value="signin">{renderForm(false)}</TabsContent>
                    <TabsContent value="signup">{renderForm(true)}</TabsContent>
                </Tabs>
            </TabsContent>
        </Tabs>

      </DialogContent>
    </Dialog>
  );
}
