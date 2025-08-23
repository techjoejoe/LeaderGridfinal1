
"use client";

import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Link from "next/link";
import { useState, useEffect } from "react";
import Image from "next/image";
import { SignInDialog } from "@/components/sign-in-dialog";
import { Sparkles } from "@/components/sparkles";

export default function Home() {
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
      <main className="container mx-auto px-4 py-8 md:py-16">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <h1 className="text-4xl md:text-6xl font-headline font-bold mb-4 leading-tight">
              The Ultimate Photo Contest
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8">
              Upload your best shots, vote for your favorites, and climb the leaderboard to victory.
            </p>
            <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Link href="/contests">
                Enter the Contest
              </Link>
            </Button>
          </div>
          <div className="relative aspect-square max-w-md mx-auto w-full">
             <Sparkles color="#FFC700" className="z-10" />
             <Image 
                src="https://placehold.co/600x600.png"
                alt="Photo contest winner holding a trophy"
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="rounded-full object-cover shadow-lg border-8 border-card"
                data-ai-hint="photo contest"
             />
          </div>
        </div>
      </main>
      <SignInDialog
        isOpen={isSignInOpen}
        onOpenChange={setSignInOpen}
      />
    </>
  );
}
