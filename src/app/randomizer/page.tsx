
"use client";

import { Header } from "@/components/header";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import React, { useState, useEffect, Suspense } from "react";
import { SignInDialog } from "@/components/sign-in-dialog";
import { RandomizerWheel } from "@/components/randomizer-wheel";
import { Skeleton } from "@/components/ui/skeleton";


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
      <main>
        <Suspense fallback={<div className="container mx-auto p-8"><Skeleton className="h-[600px] w-full" /></div>}>
            <RandomizerWheel />
        </Suspense>
      </main>
      <SignInDialog
        isOpen={isSignInOpen}
        onOpenChange={setSignInOpen}
      />
    </>
  );
}
