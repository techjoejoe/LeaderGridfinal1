
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Header } from "@/components/header";
import { SignInDialog } from "@/components/sign-in-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Confetti } from "@/components/confetti";
import * as Tone from "tone";
import { cn } from "@/lib/utils";
import { Play, Pause, RotateCcw, Maximize, Minimize, Volume2, VolumeX } from "lucide-react";

const ActivityTimer = () => {
  const [minutes, setMinutes] = useState(5);
  const [seconds, setSeconds] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(300);
  const [timeLeft, setTimeLeft] = useState(300);
  const [isRunning, setIsRunning] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [customMessage, setCustomMessage] = useState("Time's Up! Great job!");
  const [isMuted, setIsMuted] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const synth = useRef<Tone.Synth | null>(null);

  useEffect(() => {
    // Initialize Tone.js synth
    if (typeof window !== "undefined") {
      synth.current = new Tone.Synth().toDestination();
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const playBeep = useCallback((note: string, duration: string) => {
    if (isMuted || !synth.current) return;
    try {
      if (Tone.context.state !== 'running') {
        Tone.context.resume();
      }
      synth.current.triggerAttackRelease(note, duration);
    } catch (error) {
      console.error("Error playing sound:", error);
    }
  }, [isMuted]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            clearInterval(intervalRef.current!);
            setIsRunning(false);
            setShowCelebration(true);
            playBeep("C5", "0.5s");
            setTimeout(() => {
              if (synth.current) {
                const now = Tone.now();
                synth.current.triggerAttackRelease("C4", "8n", now);
                synth.current.triggerAttackRelease("E4", "8n", now + 0.2);
                synth.current.triggerAttackRelease("G4", "8n", now + 0.4);
                synth.current.triggerAttackRelease("C5", "4n", now + 0.6);
              }
            }, 100); // Play completion sound shortly after final beep
            if (!isMaximized) setIsMaximized(true);
            return 0;
          }
          const newTime = prevTime - 1;
          if (newTime <= 10 && newTime > 3) {
            playBeep("C4", "0.1s");
          } else if (newTime <= 3 && newTime > 0) {
            playBeep("G4", "0.1s");
          }
          return newTime;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, playBeep, isMaximized]);

  const handleStart = async () => {
    if (Tone.context.state !== 'running') {
      await Tone.start();
    }
    const newTotalSeconds = minutes * 60 + seconds;
    if (newTotalSeconds <= 0) return;
    setTotalSeconds(newTotalSeconds);
    setTimeLeft(newTotalSeconds);
    setIsRunning(true);
    setShowCelebration(false);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(totalSeconds);
    setShowCelebration(false);
    if(isMaximized && showCelebration) setIsMaximized(false);
  };

  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setMinutes(Math.max(0, Math.min(59, value || 0)));
  };

  const handleSecondsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setSeconds(Math.max(0, Math.min(59, value || 0)));
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = time % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const getBackgroundColor = () => {
    if (showCelebration) return "bg-green-500";
    if (!isRunning) return "bg-gray-700";
    
    const percentage = (timeLeft / totalSeconds) * 100;
    if (timeLeft <= 10) return "bg-red-500";
    if (timeLeft <= 30) return "bg-orange-500";
    return "bg-green-500";
  };
  
  const cardContent = (
      <>
        <div className={cn(
            "timer-display w-full flex items-center justify-center rounded-lg text-white transition-all duration-500",
            isMaximized ? "h-full" : "h-48",
            getBackgroundColor(),
            { "animate-pulse": isRunning && timeLeft <= 10 }
        )}>
            <h1 className={cn(
                "font-mono font-bold tracking-tighter",
                isMaximized ? "text-[15rem] leading-none" : "text-8xl"
            )}>
                {formatTime(timeLeft)}
            </h1>
        </div>

        {!isMaximized && (
        <div className="p-6">
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <Label htmlFor="minutes">Minutes</Label>
                    <Input id="minutes" type="number" value={minutes} onChange={handleMinutesChange} min="0" max="59" disabled={isRunning} />
                </div>
                <div>
                    <Label htmlFor="seconds">Seconds</Label>
                    <Input id="seconds" type="number" value={seconds} onChange={handleSecondsChange} min="0" max="59" disabled={isRunning} />
                </div>
            </div>
             <div className="mb-6">
                <Label htmlFor="customMessage">Completion Message</Label>
                <Input id="customMessage" value={customMessage} onChange={(e) => setCustomMessage(e.target.value)} placeholder="Time's Up! Great job!" />
            </div>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Set the time and press start. The timer will begin counting down.
            </p>
        </div>
        )}

        <div className={cn(
            "controls flex gap-4 w-full",
            isMaximized ? "p-4 justify-center" : "px-6 pb-6 justify-between"
        )}>
             {!isRunning ? (
                <Button onClick={handleStart} size={isMaximized ? "lg" : "default"} className="w-full bg-green-600 hover:bg-green-700 text-white">
                    <Play className="mr-2 h-5 w-5" /> Start
                </Button>
            ) : (
                <Button onClick={handlePause} size={isMaximized ? "lg" : "default"} className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                    <Pause className="mr-2 h-5 w-5" /> Pause
                </Button>
            )}
            <Button onClick={handleReset} variant="outline" size={isMaximized ? "lg" : "default"} className="w-full">
                <RotateCcw className="mr-2 h-5 w-5" /> Reset
            </Button>
        </div>
    </>
  );

  return (
    <div className={cn(
        "relative w-full h-full flex flex-col items-center justify-center transition-all duration-300",
        isMaximized && "fixed inset-0 bg-gradient-to-br from-blue-900 to-purple-900 z-50 p-4"
    )}>
        <div className="absolute top-4 right-4 z-50 flex gap-2">
            <Button variant="ghost" size="icon" onClick={() => setIsMuted(!isMuted)}>
                {isMuted ? <VolumeX className="text-white"/> : <Volume2 className="text-white"/>}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setIsMaximized(!isMaximized)}>
                {isMaximized ? <Minimize className="text-white"/> : <Maximize className="text-gray-500"/>}
            </Button>
        </div>

        {showCelebration && isMaximized ? (
            <div className="w-full h-full flex flex-col items-center justify-center text-center text-white p-4">
                <Confetti onAnimationComplete={() => {}} />
                <h2 className="text-7xl font-bold mb-8 animate-pulse">{customMessage}</h2>
                <Button onClick={() => {
                    setShowCelebration(false);
                    setIsMaximized(false);
                    handleReset();
                }} size="lg">
                    Start a New Timer
                </Button>
            </div>
        ) : (
             <div className={cn(
                "w-full transition-all duration-300",
                isMaximized ? "h-full flex flex-col items-center justify-center" : "max-w-md bg-card rounded-xl shadow-lg overflow-hidden"
             )}>
                {cardContent}
            </div>
        )}
    </div>
  )
};

export default function TickrPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isSignInOpen, setSignInOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  return (
    <>
      <Header 
        user={user}
        onSignInClick={() => setSignInOpen(true)}
      />
      <main className="container mx-auto px-4 py-8 flex-grow flex items-center justify-center">
        <ActivityTimer />
      </main>
      <SignInDialog
        isOpen={isSignInOpen}
        onOpenChange={setSignInOpen}
      />
    </>
  );
}
