
"use client";

import { useState, useEffect, Suspense } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Header } from "@/components/header";
import { SignInDialog } from "@/components/sign-in-dialog";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "next/navigation";
import { HostPanel } from "@/components/quiz-battle/host-panel";
import { PlayerPanel } from "@/components/quiz-battle/player-panel";
import { cn } from "@/lib/utils";

function QuizBattleComponent() {
  const [user, setUser] = useState<User | null>(null);
  const [isSignInOpen, setSignInOpen] = useState(false);
  const [view, setView] = useState<'host' | 'player'>('host');
  const searchParams = useSearchParams();
  const classId = searchParams.get('classId');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  return (
    <>
      <style>{`
        .quiz-battle-bg {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
      `}</style>
      <div className="min-h-screen quiz-battle-bg">
        <Header 
          user={user}
          onSignInClick={() => setSignInOpen(true)}
        />
        <main className="container mx-auto px-4 py-8">
            <div className="text-center text-white mb-8">
                <h1 className="text-4xl md:text-5xl font-bold text-shadow-lg">Quiz Battle</h1>
                <p className="text-lg">Real-time Interactive Quiz Platform</p>
            </div>

             <div className="flex gap-2 justify-center mb-8">
                <Button 
                    onClick={() => setView('host')} 
                    variant={view === 'host' ? 'secondary': 'outline'}
                    className={cn(view === 'host' && "bg-white/90 text-primary hover:bg-white")}
                    >
                        Host View
                </Button>
                <Button 
                    onClick={() => setView('player')} 
                    variant={view === 'player' ? 'secondary': 'outline'}
                    className={cn(view === 'player' && "bg-white/90 text-primary hover:bg-white")}
                >
                    Player View
                </Button>
            </div>
          
            {view === 'host' ? <HostPanel classId={classId} user={user} /> : <PlayerPanel />}

        </main>
        <SignInDialog
          isOpen={isSignInOpen}
          onOpenChange={setSignInOpen}
        />
      </div>
    </>
  );
}


export default function QuizBattlePage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <QuizBattleComponent />
        </Suspense>
    )
}
