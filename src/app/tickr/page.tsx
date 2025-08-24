
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"


const ActivityTimer = () => {
  const [mode, setMode] = useState<"countdown" | "schedule">("countdown");
  const [minutes, setMinutes] = useState(5);
  const [seconds, setSeconds] = useState(0);
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [endTime, setEndTime] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [customMessage, setCustomMessage] = useState("Time's Up! Please go back to your seats!");
  const [isMuted, setIsMuted] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const synth = useRef<Tone.Synth | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      synth.current = new Tone.Synth().toDestination();

      const savedState = localStorage.getItem('activityTimerState');
      if (savedState) {
        const { endTime: savedEndTime, message: savedMessage } = JSON.parse(savedState);
        const now = Date.now();
        if (savedEndTime > now) {
          setEndTime(savedEndTime);
          setTimeLeft(Math.round((savedEndTime - now) / 1000));
          setIsRunning(true);
          if (savedMessage) setCustomMessage(savedMessage);
        } else {
          // Timer finished while user was away
          setShowCelebration(true);
          if (!isMaximized) setIsMaximized(true);
          localStorage.removeItem('activityTimerState');
        }
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isMaximized]);

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
    if (isRunning && endTime) {
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const remaining = Math.round((endTime - now) / 1000);
        
        if (remaining <= 0) {
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
          }, 100);
          if (!isMaximized) setIsMaximized(true);
          localStorage.removeItem('activityTimerState');
          setTimeLeft(0);
        } else {
          setTimeLeft(remaining);
          if (remaining <= 10 && remaining > 3) playBeep("C4", "0.1s");
          else if (remaining <= 3 && remaining > 0) playBeep("G4", "0.1s");
        }
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, endTime, playBeep, isMaximized]);

  const handleStart = async () => {
    if (Tone.context.state !== 'running') {
      await Tone.start();
    }

    let durationInSeconds = 0;
    if (mode === 'countdown') {
      durationInSeconds = minutes * 60 + seconds;
    } else {
      const now = new Date();
      const [hours, mins] = scheduleTime.split(':').map(Number);
      const targetTime = new Date();
      targetTime.setHours(hours, mins, 0, 0);
      if (targetTime < now) {
        targetTime.setDate(targetTime.getDate() + 1); // schedule for tomorrow if time has passed
      }
      durationInSeconds = Math.round((targetTime.getTime() - now.getTime()) / 1000);
    }

    if (durationInSeconds <= 0) return;
    
    const newEndTime = Date.now() + durationInSeconds * 1000;
    setEndTime(newEndTime);
    setTimeLeft(durationInSeconds);
    setIsRunning(true);
    setShowCelebration(false);

    localStorage.setItem('activityTimerState', JSON.stringify({ endTime: newEndTime, message: customMessage }));
  };

  const handlePause = () => {
    setIsRunning(false);
    if(intervalRef.current) clearInterval(intervalRef.current);
    localStorage.removeItem('activityTimerState');
  };

  const handleReset = () => {
    setIsRunning(false);
    if(intervalRef.current) clearInterval(intervalRef.current);
    setShowCelebration(false);
    if(isMaximized && showCelebration) setIsMaximized(false);
    setTimeLeft(0);
    setEndTime(null);
    localStorage.removeItem('activityTimerState');
  };
  
  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = time % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const getBorderColor = () => {
    if (showCelebration) return "border-green-400";
    if (!isRunning) return "border-gray-500/50";
    if (timeLeft <= 10) return "border-red-500";
    if (timeLeft <= 30) return "border-orange-500";
    return "border-transparent";
  };
  
  const getBackgroundColor = () => {
    if (!isRunning) return "";
    if (showCelebration) return "";
    if (timeLeft <= 10) return "";
    if (timeLeft <= 30) return "";
    return "bg-animated-gradient";
  }

  const cardContent = (
      <>
        <div className={cn(
            "timer-display bg-glassmorphism w-full flex items-center justify-center rounded-lg text-white transition-all duration-500 border-2",
            isMaximized ? "h-full" : "h-48",
            getBorderColor(),
            { "animate-pulse": isRunning && timeLeft <= 10 },
            getBackgroundColor()
        )}>
            <h1 className={cn(
                "font-mono font-bold tracking-tighter",
                isMaximized ? "text-[15rem] leading-none" : "text-8xl",
                {"text-shadow-lg": !getBackgroundColor()}
            )}>
                {formatTime(timeLeft)}
            </h1>
        </div>

        {!isMaximized && (
        <div className="p-6">
            <Tabs value={mode} onValueChange={(value) => setMode(value as any)} className="w-full mb-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="countdown">Countdown</TabsTrigger>
                <TabsTrigger value="schedule">Schedule</TabsTrigger>
              </TabsList>
              <TabsContent value="countdown" className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                      <Label htmlFor="minutes">Minutes</Label>
                      <Input id="minutes" type="number" value={minutes} onChange={(e) => setMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))} min="0" max="59" disabled={isRunning} className="bg-white/10" />
                  </div>
                  <div>
                      <Label htmlFor="seconds">Seconds</Label>
                      <Input id="seconds" type="number" value={seconds} onChange={(e) => setSeconds(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))} min="0" max="59" disabled={isRunning} className="bg-white/10" />
                  </div>
              </TabsContent>
              <TabsContent value="schedule" className="mt-4">
                  <Label htmlFor="scheduleTime">End Time</Label>
                  <Input id="scheduleTime" type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} disabled={isRunning} className="bg-white/10" />
              </TabsContent>
            </Tabs>

             <div className="mb-6">
                <Label htmlFor="customMessage">Completion Message</Label>
                <Input id="customMessage" value={customMessage} onChange={(e) => setCustomMessage(e.target.value)} placeholder="Time's Up! Please go back to your seats!" className="bg-white/10"/>
            </div>
             <p className="text-sm text-muted-foreground text-center mb-4">
              {mode === 'countdown' ? 'Set the duration and press start.' : `Timer will end at ${new Date(new Date().toDateString() + ' ' + scheduleTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}.`}
            </p>
        </div>
        )}

        <div className={cn(
            "controls flex gap-4 w-full",
            isMaximized ? "p-4 justify-center" : "px-6 pb-6 justify-between"
        )}>
             {!isRunning ? (
                <Button onClick={handleStart} size={isMaximized ? "lg" : "default"} className="w-full bg-green-600/80 hover:bg-green-700/80 text-white bg-glassmorphism">
                    <Play className="mr-2 h-5 w-5" /> Start
                </Button>
            ) : (
                <Button onClick={handlePause} size={isMaximized ? "lg" : "default"} className="w-full bg-orange-500/80 hover:bg-orange-600/80 text-white bg-glassmorphism">
                    <Pause className="mr-2 h-5 w-5" /> Pause
                </Button>
            )}
            <Button onClick={handleReset} variant="outline" size={isMaximized ? "lg" : "default"} className="w-full bg-white/10 hover:bg-white/20">
                <RotateCcw className="mr-2 h-5 w-5" /> Reset
            </Button>
        </div>
    </>
  );

  return (
    <div className={cn(
        "relative w-full h-full flex flex-col items-center justify-center transition-all duration-300",
        isMaximized && "fixed inset-0 bg-background z-50 p-4 overflow-hidden"
    )}>
        {isMaximized && (
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-0 left-0 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob-1"></div>
            <div className="absolute top-0 right-0 w-72 h-72 bg-yellow-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob-2"></div>
            <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob-1 animation-delay-4000"></div>
          </div>
        )}

        <div className="absolute top-4 right-4 z-50 flex gap-2">
            <Button variant="ghost" size="icon" onClick={() => setIsMuted(!isMuted)} className="bg-black/20 hover:bg-black/30">
                {isMuted ? <VolumeX className="text-white"/> : <Volume2 className="text-white"/>}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setIsMaximized(!isMaximized)} className="bg-black/20 hover:bg-black/30">
                {isMaximized ? <Minimize className="text-white"/> : <Maximize className="text-gray-300"/>}
            </Button>
        </div>

        {showCelebration && isMaximized ? (
            <div className="w-full h-full flex flex-col items-center justify-center text-center text-white p-4">
                <Confetti onAnimationComplete={() => {}} />
                <h2 className="text-7xl font-bold mb-8 animate-pulse" style={{textShadow: '0 0 15px rgba(255,255,255,0.7)'}}>{customMessage}</h2>
                <Button onClick={() => {
                    setShowCelebration(false);
                    setIsMaximized(false);
                    handleReset();
                }} size="lg" className="bg-glassmorphism">
                    Start a New Timer
                </Button>
            </div>
        ) : (
             <div className={cn(
                "w-full transition-all duration-300 relative z-10",
                isMaximized ? "h-full flex flex-col items-center justify-center" : "max-w-md bg-glassmorphism rounded-xl overflow-hidden"
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

    