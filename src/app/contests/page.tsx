
"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, writeBatch, query, where, getDocs } from "firebase/firestore";
import { db, auth, storage } from "@/lib/firebase";
import { ref, deleteObject } from "firebase/storage";
import { onAuthStateChanged, User } from "firebase/auth";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { CreateContestDialog } from "@/components/create-contest-dialog";
import { ContestList } from "@/components/contest-list";
import { SignInDialog } from "@/components/sign-in-dialog";
import type { Contest, ContestImageShape } from "@/lib/types";
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

  const handleCreateContest = async (contestName: string, imageShape: ContestImageShape) => {
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
        imageShape: imageShape,
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
    toast({
      title: "Deleting contest...",
      description: "This may take a moment.",
    });

    try {
      // Note: For a production app, this logic should be moved to a Firebase Cloud Function 
      // for security and atomicity. This client-side implementation is for demonstration.
      
      const batch = writeBatch(db);

      // 1. Delete all images in the contest from Firestore and Storage
      const imagesQuery = query(collection(db, "images"), where("contestId", "==", contestId));
      const imagesSnapshot = await getDocs(imagesQuery);
      
      for (const imageDoc of imagesSnapshot.docs) {
        // Delete image from storage
        const imageUrl = imageDoc.data().url;
        try {
          const imageRef = ref(storage, imageUrl);
          await deleteObject(imageRef);
        } catch (storageError: any) {
          // If file doesn't exist, we can ignore the error
          if (storageError.code !== 'storage/object-not-found') {
             console.error(`Failed to delete image from storage: ${imageUrl}`, storageError);
          }
        }
        // Delete image document from Firestore
        batch.delete(imageDoc.ref);
      }

      // 2. Delete all user vote data for this contest
      // This is more complex as it's a subcollection under each user.
      // A Cloud Function is strongly recommended for this cleanup.
      // We will skip this on the client-side as it is not efficient or secure.

      // 3. Delete the contest document itself
      const contestRef = doc(db, "contests", contestId);
      batch.delete(contestRef);

      await batch.commit();

      toast({
        title: "Contest Deleted",
        description: "The contest and all its images have been removed.",
      });

    } catch (error) {
      console.error("Error deleting contest:", error);
      toast({
        variant: "destructive",
        title: "Deletion Failed",
        description: "Could not delete the contest. Please try again.",
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
