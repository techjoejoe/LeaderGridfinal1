
"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, addDoc, serverTimestamp, Timestamp, query, where } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { getFunctions, httpsCallable } from "firebase/functions";
import { onAuthStateChanged, User } from "firebase/auth";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { PlusCircle, ArrowLeft } from "lucide-react";
import { CreateContestDialog } from "@/components/create-contest-dialog";
import { ContestList } from "@/components/contest-list";
import { SignInDialog } from "@/components/sign-in-dialog";
import type { Contest, ContestImageShape } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";


export default function ClassContestsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isSignInOpen, setSignInOpen] = useState(false);
  const [isCreateContestOpen, setCreateContestOpen] = useState(false);
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const params = useParams<{ classId: string }>();
  const classId = params.classId;
  const router = useRouter();


  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!classId) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Class ID is missing. Cannot load contests.",
        });
        setLoading(false);
        router.push("/trainerhome");
        return;
    }
    
    setLoading(true);
    const q = query(collection(db, "contests"), where("classId", "==", classId));

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
            description: "Could not fetch contests for this class.",
        });
        setLoading(false);
    });

    return () => unsubscribe();
  }, [classId, toast, router]);

  const handleCreateContest = async (contestName: string, imageShape: ContestImageShape, startDate: Date, endDate: Date, password?: string) => {
    if (!user) {
      setSignInOpen(true);
      return;
    }
    if (!classId) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Cannot create contest without a class ID.",
        });
        return;
    }

    try {
      const newContestData: Omit<Contest, 'id' | 'createdAt'> = {
        name: contestName,
        creatorUid: user.uid,
        creatorName: user.displayName || "Anonymous",
        status: "active",
        imageShape: imageShape,
        startDate: Timestamp.fromDate(startDate),
        endDate: Timestamp.fromDate(endDate),
        classId: classId,
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
        description: `Your contest "${contestName}" is now active for this class.`,
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
            <div>
                <Button asChild variant="outline" size="sm" className="mb-2">
                  <Link href={`/class/${classId}`}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Class
                  </Link>
                </Button>
                <h1 className="text-3xl font-headline font-bold">Class Contests</h1>
            </div>
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
