
"use client";

import { Header } from "@/components/header";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useState, useEffect } from "react";
import { SignInDialog } from "@/components/sign-in-dialog";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function RandomizerPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isSignInOpen, setSignInOpen] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribeAuth();
  }, []);

  return (
    <>
      <Header 
        user={user}
        onSignInClick={() => setSignInOpen(true)}
      />
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-4">
            <Button asChild variant="outline" size="sm">
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Link>
            </Button>
        </div>
        <div className="text-center py-16">
          <h1 className="text-4xl font-bold font-headline">Randomizer</h1>
          <p className="text-muted-foreground mt-2">Coming soon!</p>
        </div>
      </main>
      <SignInDialog
        isOpen={isSignInOpen}
        onOpenChange={setSignInOpen}
      />
    </>
  );
}
