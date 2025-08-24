
"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, addDoc, serverTimestamp, Timestamp, query, where } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { getFunctions, httpsCallable } from "firebase/functions";
import { onAuthStateChanged, User } from "firebase/auth";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { CreateContestDialog } from "@/components/create-contest-dialog";
import { ContestList } from "@/components/contest-list";
import { SignInDialog } from "@/components/sign-in-dialog";
import type { Contest, ContestImageShape } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useSearchParams } from "next/navigation";


export default function ContestsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isSignInOpen, setSignInOpen] = useState(false);
  const [isCreateContestOpen, setCreateContestOpen] = useState(false);
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const classId = searchParams.get('classId');

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    setLoading(true);
    let q;
    if (classId) {
      q = query(collection(db, "contests"), where("classId", "==", classId));
    } else {
      // This logic will need to be refined if you want a global contest page.
      // For now, it fetches contests NOT associated with any class.
      q = query(collection(db, "contests"), where("classId", "==", null));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const contestsData = snapshot.docs.map(
        (doc) => ({ ...doc.data(), id: doc.id } as Contest)
      );
      setContests(contestsData.sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0)));
      setLoading(false);
    }, (error) => {
        console.error("Error fetching contests:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not fetch contests.",
        });
        setLoading(false);
    });

    return () => unsubscribe();
  }, [classId, toast]);

  const handleCreateContest = async (contestName: string, imageShape: ContestImageShape, startDate: Date, endDate: Date, password?: string) => {
    if (!user) {
      setSignInOpen(true);
      return;
    }
    
    // Explicitly get classId from searchParams here
    const currentClassId = searchParams.get('classId');

    try {
      const newContestData: Omit<Contest, 'id' | 'createdAt'> = {
        name: contestName,
        creatorUid: user.uid,
        creatorName: user.displayName || "Anonymous",
        status: "active",
        imageShape: imageShape,
        startDate: Timestamp.fromDate(startDate),
        endDate: Timestamp.fromDate(endDate),
        classId: currentClassId || undefined,
      };

      if (password) {
        newContestData.hasPassword = true;
        newContestData.password = password;
      }

      await addDoc(collection(db, "contests"), {
        ...newContestData,
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

  const handleDeleteContest = async (contestId: string) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: "You must be signed in to delete a contest.",
      });
      return;
    }
    
    toast({
      title: "Deleting contest...",
      description: "This may take a moment. The page will update automatically.",
    });

    try {
      const functions = getFunctions();
      const deleteContestCallable = httpsCallable(functions, 'deleteContest');
      const result = await deleteContestCallable({ contestId });
      
      const { success, message } = result.data as { success: boolean; message: string };

      if (success) {
        toast({
          title: "Contest Deleted",
          description: message,
        });
      } else {
        throw new Error(message);
      }

    } catch (error: any) {
      console.error("Error deleting contest:", error);
      toast({
        variant: "destructive",
        title: "Deletion Failed",
        description: error.message || "Could not delete the contest. Please check permissions and try again.",
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
          <ContestList 
            contests={contests} 
            loading={loading}
            user={user}
            onDeleteContest={handleDeleteContest}
          />
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
