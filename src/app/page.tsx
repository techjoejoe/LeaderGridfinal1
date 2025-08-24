
"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { SignInDialog } from "@/components/sign-in-dialog";
import { Button } from "@/components/ui/button";
import Image from "next/image";

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [isSignInOpen, setSignInOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Redirect logged-in users to the trainer dashboard
        router.push('/trainerhome');
      }
    });
    return () => unsubscribe();
  }, [router]);

  return (
    <>
      <Header 
        user={user}
        onSignInClick={() => setSignInOpen(true)}
      />
      <main className="container mx-auto px-4 py-8 flex flex-col justify-center items-center text-center" style={{ minHeight: 'calc(100vh - 80px)' }}>
        <div className="max-w-2xl">
           <Image
                src="https://firebasestorage.googleapis.com/v0/b/picvote-h2ow0.firebasestorage.app/o/LeaderGridMascotLogo.png?alt=media&token=98f67c05-c876-4426-9f91-26cdbc73bbf6"
                alt="LeaderGrid Logo"
                width={280}
                height={280}
                className="dark:hidden mx-auto mb-6"
                priority
            />
            <Image
                src="https://firebasestorage.googleapis.com/v0/b/picvote-h2ow0.firebasestorage.app/o/LeaderGridMascotLogo.png?alt=media&token=98f67c05-c876-4426-9f91-26cdbc73bbf6"
                alt="LeaderGrid Logo"
                width={280}
                height={280}
                className="hidden dark:block mx-auto mb-6"
                priority
            />
          <h1 className="text-4xl font-bold font-headline tracking-tight sm:text-5xl">
            Engage Your Audience, Instantly
          </h1>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            The ultimate toolkit for interactive presentations and events. Launch contests, spin the wheel, run polls, and much more. Sign in to get started.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Button onClick={() => setSignInOpen(true)} size="lg">
              Get Started
            </Button>
            <a href="/studentlogin" className="text-sm font-semibold leading-6 text-foreground">
              Student Login <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>
      </main>
      <SignInDialog
        isOpen={isSignInOpen}
        onOpenChange={setSignInOpen}
        title="Welcome Back!"
        description="Sign in or create an account to access your dashboard."
      />
    </>
  );
}
