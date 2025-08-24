
"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Header } from "@/components/header";
import { SignInDialog } from "@/components/sign-in-dialog";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

export default function QuizBattlePage() {
  const [user, setUser] = useState<User | null>(null);
  const [isSignInOpen, setSignInOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleCreate = () => {
    if (!user) {
      setSignInOpen(true);
    } else {
      alert("This feature is not yet implemented.");
    }
  };

  return (
    <>
      <Header 
        user={user}
        onSignInClick={() => setSignInOpen(true)}
      />
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-headline font-bold">Quiz Battle</h1>
          <Button onClick={handleCreate}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Create New Quiz
          </Button>
        </div>
        
        <div className="text-center py-16 border-2 border-dashed rounded-lg">
          <h3 className="text-2xl font-bold font-headline">Coming Soon!</h3>
          <p className="text-muted-foreground mt-2">Quiz Battle functionality is currently under construction.</p>
        </div>
        
      </main>
      <SignInDialog
        isOpen={isSignInOpen}
        onOpenChange={setSignInOpen}
      />
    </>
  );
}
