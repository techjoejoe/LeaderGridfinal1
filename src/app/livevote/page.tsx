
"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db, rtdb } from "@/lib/firebase";
import { ref, onValue, set, get, update, remove } from "firebase/database";
import { doc, getDoc } from "firebase/firestore";
import { Header } from "@/components/header";
import { SignInDialog } from "@/components/sign-in-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import type { Poll, PollSession } from "@/lib/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, QrCode, Trash2, X, PlusCircle, ExternalLink, Presentation, Copy } from 'lucide-react';
import { AdminDashboard } from "@/components/live-vote/admin-dashboard";
import { VotingInterface } from "@/components/live-vote/voting-interface";

function LiveVoteContent() {
  const searchParams = useSearchParams();
  const classId = searchParams.get('classId');
  const sessionCode = searchParams.get('sessionCode');
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSignInOpen, setSignInOpen] = useState(false);
  const [view, setView] = useState<'loading' | 'admin' | 'voter' | 'no_session'>('loading');
  const [sessionData, setSessionData] = useState<PollSession | null>(null);
  const { toast } = useToast();

  const verifyAdmin = useCallback(async (user: User, classId: string) => {
    const classRef = doc(db, "classes", classId);
    const classSnap = await getDoc(classRef);
    if (classSnap.exists() && classSnap.data().trainerUid === user.uid) {
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (classId) {
        if (currentUser) {
          const isAdmin = await verifyAdmin(currentUser, classId);
          if (isAdmin) {
            setView('admin');
          } else {
            toast({ variant: 'destructive', title: 'Access Denied', description: 'You do not have permission to manage this session.' });
            router.push('/trainerhome');
          }
        } else {
          setSignInOpen(true);
        }
      } else if (sessionCode) {
        setView('voter');
      } else {
        setView('no_session');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [classId, sessionCode, router, toast, verifyAdmin]);

  // Listener for session data for both admin and voter
  useEffect(() => {
    const sessionId = classId || sessionData?.id;
    if (!sessionId) {
      if (sessionCode) {
        // If we are a voter, we need to find the session ID from the code first
        const sessionsRef = ref(rtdb, 'live-polls');
        get(sessionsRef).then(snapshot => {
          if (snapshot.exists()) {
            const allSessions = snapshot.val();
            const matchingSessionId = Object.keys(allSessions).find(id => allSessions[id].code === sessionCode);
            if (matchingSessionId) {
              const sessionRef = ref(rtdb, `live-polls/${matchingSessionId}`);
              onValue(sessionRef, (snapshot) => {
                setSessionData(snapshot.val());
              });
            } else {
              setView('no_session');
            }
          } else {
            setView('no_session');
          }
        });
      }
      return;
    };
    
    const sessionRef = ref(rtdb, `live-polls/${sessionId}`);
    const unsubscribe = onValue(sessionRef, (snapshot) => {
      const data = snapshot.val();
      setSessionData(data);
      if (view === 'admin' && !data) {
        // Admin view but no session yet, this is fine
      } else if (view === 'voter' && !data) {
        toast({ variant: 'destructive', title: 'Session Not Found' });
        setView('no_session');
      }
    });

    return () => unsubscribe();
  }, [classId, sessionCode, toast, view, sessionData?.id]);


  const createSession = async () => {
    if (!user || !classId) return;
    const sessionCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const sessionRef = ref(rtdb, `live-polls/${classId}`);
    const newSession: PollSession = {
      id: classId,
      code: sessionCode,
      adminUid: user.uid,
      polls: {},
      isAcceptingVotes: true,
      createdAt: Date.now(),
    };
    await set(sessionRef, newSession);
    setSessionData(newSession);
  };
  
  if (loading || view === 'loading') {
    return <div className="text-center p-10">Loading...</div>;
  }

  return (
    <>
      <main className="container mx-auto px-4 py-8">
        {view === 'admin' && classId && user && (
          <AdminDashboard
            classId={classId}
            session={sessionData}
            onCreateSession={createSession}
          />
        )}
        {view === 'voter' && sessionCode && (
          <VotingInterface session={sessionData} sessionCode={sessionCode} />
        )}
        {view === 'no_session' && (
          <Card className="max-w-lg mx-auto">
            <CardHeader>
              <CardTitle>Join a Live Poll Session</CardTitle>
              <CardDescription>Enter a session code to participate or go to your class dashboard to start a new session.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input placeholder="Enter Session Code" onChange={(e) => router.replace(`/livevote?sessionCode=${e.target.value}`)} />
                <Button>Join</Button>
              </div>
            </CardContent>
             <CardFooter>
                <Button variant="outline" className="w-full" onClick={() => router.push('/trainerhome')}>Go to Trainer Dashboard</Button>
            </CardFooter>
          </Card>
        )}
      </main>
      <SignInDialog isOpen={isSignInOpen} onOpenChange={setSignInOpen} />
    </>
  );
}


export default function LiveVotePage() {
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
          setUser(currentUser);
        });
        return () => unsubscribeAuth();
    }, []);
    
    return (
        <Suspense fallback={<div className="text-center p-10">Loading Page...</div>}>
            <Header
                user={user}
                onSignInClick={() => {}} // SignInDialog is handled inside content
            />
            <LiveVoteContent />
        </Suspense>
    )
}
