
"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { collection, onSnapshot, query, where, doc, setDoc } from "firebase/firestore";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { db, auth, storage } from "@/lib/firebase";
import type { PicVoteImage, Contest } from "@/lib/types";
import { onAuthStateChanged, User } from "firebase/auth";
import { Header } from "@/components/header";
import { SignInDialog } from "@/components/sign-in-dialog";
import { LeaderboardTable } from "@/components/leaderboard-table";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, ArrowLeft, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { UploadDialog } from "@/components/upload-dialog";

function LeaderboardContent() {
  const searchParams = useSearchParams();
  const contestId = searchParams.get('contestId');
  
  const [images, setImages] = useState<PicVoteImage[]>([]);
  const [contest, setContest] = useState<Contest | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUploadOpen, setUploadOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isSignInOpen, setSignInOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!contestId) {
        setLoading(false);
        return;
    }
    setLoading(true);
    const contestRef = doc(db, "contests", contestId);
    const unsubscribeContest = onSnapshot(contestRef, (doc) => {
        if (doc.exists()) {
            setContest({ ...doc.data(), id: doc.id } as Contest);
        } else {
            toast({
                variant: "destructive",
                title: "Error",
                description: "This contest does not exist.",
            });
            setContest(null);
        }
    });

    const imagesQuery = query(collection(db, "images"), where("contestId", "==", contestId));
    const unsubscribeImages = onSnapshot(imagesQuery, (snapshot) => {
      const imagesData = snapshot.docs.map(
        (doc) => ({ ...doc.data(), id: doc.id } as PicVoteImage)
      );
      setImages(imagesData);
      setLoading(false);
    });

    return () => {
        unsubscribeContest();
        unsubscribeImages();
    };
  }, [contestId, toast]);

  const handleUpload = async (photoName: string, uploaderName: string, dataUrl: string) => {
    if (!user || !contestId) {
      setSignInOpen(true);
      return;
    }
    setUploadOpen(false);
    toast({
      title: "Uploading Photo...",
      description: "Please wait while your photo is being uploaded.",
    });

    try {
      const newImageDocRef = doc(collection(db, "images"));
      const newImageId = newImageDocRef.id;

      const storageRef = ref(storage, `images/${newImageId}.webp`);
      
      const snapshot = await uploadString(storageRef, dataUrl, 'data_url');
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      const newImage: Omit<PicVoteImage, 'id'> = {
        name: photoName,
        firstName: uploaderName || user.displayName || "Anonymous",
        lastName: "",
        url: downloadURL,
        votes: 0,
        uploaderUid: user.uid,
        contestId: contestId,
      };

      await setDoc(newImageDocRef, newImage);
      
      toast({
        title: "Photo Uploaded!",
        description: `${photoName} is now in the running.`,
      });
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: "Could not upload your photo. Please try again.",
      });
    }
  };

  const sortedImages = useMemo(() => {
    return [...images].sort((a, b) => b.votes - a.votes);
  }, [images]);

  if (!contestId) {
    return (
        <div className="text-center py-16">
            <h2 className="text-2xl font-bold">No Contest Selected</h2>
            <p className="text-muted-foreground mt-2">Please select a contest to view the leaderboard.</p>
            <Button asChild className="mt-4">
                <Link href="/contests">Go to Contests</Link>
            </Button>
        </div>
    )
  }

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <Button asChild variant="outline" size="sm">
          <Link href="/contests">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Contests
          </Link>
        </Button>
        <Button onClick={() => user ? setUploadOpen(true) : setSignInOpen(true)} size="sm">
            <Upload className="mr-2 h-4 w-4" />
            Upload Photo
        </Button>
      </div>
      <div className="flex items-center gap-3 mb-4">
        <Users className="h-8 w-8" />
        <div>
            <h1 className="text-3xl font-headline font-bold">{contest?.name ?? 'Leaderboard'}</h1>
            <p className="text-lg text-muted-foreground">
              See who's in the lead. The rankings are updated in real-time.
            </p>
        </div>
      </div>
      

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : (
        <LeaderboardTable images={sortedImages} />
      )}
       <UploadDialog
        isOpen={isUploadOpen}
        onOpenChange={setUploadOpen}
        onUpload={handleUpload}
      />
       <SignInDialog
        isOpen={isSignInOpen}
        onOpenChange={setSignInOpen}
      />
    </>
  );
}

export default function LeaderboardPage() {
    return (
        <Suspense fallback={<div className="container mx-auto px-4 py-8"><Skeleton className="h-96 w-full" /></div>}>
            <HeaderWrapper />
        </Suspense>
    )
}

function HeaderWrapper() {
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
                <LeaderboardContent />
            </main>
            <SignInDialog
                isOpen={isSignInOpen}
                onOpenChange={setSignInOpen}
            />
        </>
    );
}
