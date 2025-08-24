
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
import { AdminDashboard } from "@/components/live-vote/admin-dashboard";
import { VotingInterface } from "@/components/live-vote/voting-interface";
import { getFunctions, httpsCallable } from "firebase/functions";

function LiveVoteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const classId = searchParams.get('classId');
  const sessionCode = searchParams.get('sessionCode');

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSignInOpen, setSignInOpen] = useState(false);
  const [view, setView] = useState<'loading' | 'admin' | 'voter' | 'no_session'>('loading');
  const [sessionData, setSessionData] = useState<PollSession | null>(null);
  const { toast } = useToast();

  const verifyAdmin = useCallback(async (user: User, classId: string) => {
    const classRef = doc(db, "classes", classId);
    const classSnap = await getDoc(classRef);
    return classSnap.exists() && classSnap.data().trainerUid === user.uid;
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
    });
    return () => unsubscribe();
  }, [classId, sessionCode, router, toast, verifyAdmin]);

  // Listener for session data for both admin and voter
  useEffect(() => {
    let sessionId: string | null = classId;

    const findSessionIdByCode = async (code: string) => {
      const sessionsRef = ref(rtdb, 'live-polls');
      const snapshot = await get(sessionsRef);
      if (snapshot.exists()) {
        const allSessions = snapshot.val();
        const matchingId = Object.keys(allSessions).find(id => allSessions[id].code === code);
        return matchingId || null;
      }
      return null;
    };

    const setupListener = (id: string) => {
      const sessionRef = ref(rtdb, `live-polls/${id}`);
      const unsubscribe = onValue(sessionRef, (snapshot) => {
        const data = snapshot.val();
        setSessionData(data);
        setLoading(false);
        if (view === 'voter' && !data) {
          toast({ variant: 'destructive', title: 'Session Not Found' });
          setView('no_session');
        }
      });
      return unsubscribe;
    };

    let unsubscribe: (() => void) | undefined;

    const initialize = async () => {
      if (view === 'loading') return;
      
      setLoading(true);

      if (view === 'admin' && classId) {
        unsubscribe = setupListener(classId);
      } else if (view === 'voter' && sessionCode) {
        sessionId = await findSessionIdByCode(sessionCode);
        if (sessionId) {
          unsubscribe = setupListener(sessionId);
        } else {
          setSessionData(null);
          setView('no_session');
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };
    
    initialize();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [view, classId, sessionCode, toast]);


  const createSession = async () => {
    if (!user || !classId) return;
    setLoading(true);
    try {
        const functions = getFunctions();
        const createPollSession = httpsCallable(functions, 'createPollSession');
        await createPollSession({ classId: classId });
        // The listener will automatically pick up the new session data
    } catch (error: any) {
        console.error("Error creating session:", error);
        toast({ variant: "destructive", title: "Error", description: error.message || "Could not create session."});
        setLoading(false);
    }
  };
  
  if (view === 'loading') {
    return <div className="text-center p-10">Loading...</div>;
  }

  const handleJoinSession = (code: string) => {
    if (code) {
      router.push(`/livevote?sessionCode=${code}`);
    }
  }

  return (
    <>
      <main className="container mx-auto px-4 py-8">
        {view === 'admin' && classId && user && (
          <AdminDashboard
            classId={classId}
            session={sessionData}
            onCreateSession={createSession}
            loading={loading}
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
              <form onSubmit={(e) => { e.preventDefault(); handleJoinSession(e.currentTarget.sessionCode.value); }} className="flex gap-2">
                <Input name="sessionCode" placeholder="Enter Session Code" />
                <Button type="submit">Join</Button>
              </form>
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
