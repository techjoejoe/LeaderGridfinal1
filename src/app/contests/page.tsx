
"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { CreateContestDialog } from "@/components/create-contest-dialog";
import { ContestList } from "@/components/contest-list";
import { SignInDialog } from "@/components/sign-in-dialog";
import type { Contest } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";


export default function ContestsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isSignInOpen, setSignInOpen] = useState(false);
  const [isCreateContestOpen, setCreateContestOpen] = useState(false);
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = onSnapshot(collection(db, "contests"), (snapshot) => {
      const contestsData = snapshot.docs.map(
        (doc) => ({ ...doc.data(), id: doc.id } as Contest)
      );
      setContests(contestsData.sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0)));
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleCreateContest = async (contestName: string) => {
    if (!user) {
      setSignInOpen(true);
      return;
    }

    try {
      await addDoc(collection(db, "contests"), {
        name: contestName,
        creatorUid: user.uid,
        creatorName: user.displayName || "Anonymous",
        status: "active",
        createdAt: serverTimestamp(),
      });
      toast({
        title: "Contest Created!",
        description: `Your contest "${contestName}" is now active.`,
      });
      setCreateContestOpen(false);
    } catch (error) {
      console.error("Error creating contest:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not create the contest. Please try again.",
      });
    }
  };


  return (
    <>
      <Header 
        user={user}
        onSignInClick={() => setSignInOpen(true)}
      />
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-headline font-bold">Contests</h1>
          <Button onClick={() => user ? setCreateContestOpen(true) : setSignInOpen(true)} >
            <PlusCircle className="mr-2 h-4 w-4" />
            Create New Contest
          </Button>
        </div>
        
        {user ? (
          <ContestList contests={contests} loading={loading} />
        ) : (
          <div className="text-center py-16 border-2 border-dashed rounded-lg">
            <h3 className="text-2xl font-bold font-headline">Please Sign In</h3>
            <p className="text-muted-foreground mt-2">You need to be signed in to view or create contests.</p>
            <Button onClick={() => setSignInOpen(true)} className="mt-4">Sign In</Button>
          </div>
        )}
        
      </main>
      <SignInDialog
        isOpen={isSignInOpen}
        onOpenChange={setSignInOpen}
      />
      <CreateContestDialog
        isOpen={isCreateContestOpen}
        onOpenChange={setCreateContestOpen}
        onCreate={handleCreateContest}
      />
    </>
  );
}

