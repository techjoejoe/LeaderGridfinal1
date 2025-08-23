
"use client";

import { Header } from "@/components/header";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useState, useEffect } from "react";
import { SignInDialog } from "@/components/sign-in-dialog";
import { DashboardCard } from "@/components/dashboard-card";
import { PieChart, Trophy, Vote, Timer, Zap, HelpCircle } from "lucide-react";

const dashboardTools = [
  {
    title: "Randomizer Wheel",
    description: "Spin a wheel to randomly select a name or item.",
    icon: PieChart,
    href: "#",
    disabled: true,
  },
  {
    title: "Photo Contest",
    description: "Run a photo contest and let users vote for the best one.",
    icon: Trophy,
    href: "/contests",
    disabled: false,
  },
  {
    title: "Live Poll",
    description: "Create and run live polls to gather real-time feedback.",
    icon: Vote,
    href: "#",
    disabled: true,
  },
  {
    title: "Activity Timer",
    description: "Set a countdown timer for activities and breaks.",
    icon: Timer,
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
          {dashboardTools.map((tool) => (
            <DashboardCard
              key={tool.title}
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

