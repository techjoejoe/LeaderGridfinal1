
"use client";

import { Header } from "@/components/header";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useState, useEffect } from "react";
import { SignInDialog } from "@/components/sign-in-dialog";
import { DashboardCard } from "@/components/dashboard-card";
import { Zap, HelpCircle, QrCode } from "lucide-react";
import Image from "next/image";

const dashboardTools = [
  {
    description: "Spin a wheel to randomly select a name or item.",
    icon: (
      <Image
        src="https://firebasestorage.googleapis.com/v0/b/picvote-h2ow0.firebasestorage.app/o/randomizer.png?alt=media&token=1acfebed-1dfe-4651-af05-23b96d3c66e6"
        alt="Randomizer Wheel Logo"
        width={140}
        height={40}
      />
    ),
    href: "#",
    disabled: true,
  },
  {
    description: "Run a photo contest and let users vote for the best one.",
    icon: (
      <Image
        src="https://firebasestorage.googleapis.com/v0/b/picvote-h2ow0.firebasestorage.app/o/logo-light.png?alt=media&token=576a43d9-43ef-4307-868f-130e212228c1"
        alt="PicPick Logo"
        width={140}
        height={40}
        className="dark:hidden"
      />
    ),
    href: "/contests",
    disabled: false,
  },
  {
    description: "Create and run live polls to gather real-time feedback.",
    icon: (
      <Image
        src="https://firebasestorage.googleapis.com/v0/b/picvote-h2ow0.firebasestorage.app/o/Livevote.png?alt=media&token=821a851e-8449-4ede-8005-9be175576be4"
        alt="Live Poll Logo"
        width={140}
        height={40}
      />
    ),
    href: "#",
    disabled: true,
  },
  {
    description: "Set a countdown timer for activities and breaks.",
    icon: (
        <Image
            src="https://firebasestorage.googleapis.com/v0/b/picvote-h2ow0.firebasestorage.app/o/Tickr.png?alt=media&token=0ea8fafc-822b-4cfc-bc88-6fbbd8959479"
            alt="Tickr Logo"
            width={140}
            height={40}
        />
    ),
    href: "#",
    disabled: true,
  },
  {
    title: "First to Buzz In",
    description: "A virtual buzzer for trivia and quiz games.",
    icon: Zap,
    href: "#",
    disabled: true,
  },
  {
    title: "Quiz",
    description: "Create and administer quizzes with automated scoring.",
    icon: HelpCircle,
    href: "#",
    disabled: true,
  },
  {
    title: "QR Code Points Game",
    description: "A fun, interactive game where users scan QR codes to earn points.",
    icon: QrCode,
    href: "#",
    disabled: true,
  },
]


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
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold font-headline">Trainer Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Select a tool to get started.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {dashboardTools.map((tool, index) => (
            <DashboardCard
              key={tool.title || index}
              title={tool.title}
              description={tool.description}
              icon={tool.icon}
              href={tool.href}
              disabled={tool.disabled}
            />
          ))}
        </div>
      </main>
      <SignInDialog
        isOpen={isSignInOpen}
        onOpenChange={setSignInOpen}
      />
    </>
  );
}
