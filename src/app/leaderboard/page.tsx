
"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { collection, onSnapshot, query, where, doc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import type { PicVoteImage, Contest } from "@/lib/types";
import { onAuthStateChanged, User } from "firebase/auth";
import { Header } from "@/components/header";
import { SignInDialog } from "@/components/sign-in-dialog";
import { LeaderboardTable } from "@/components/leaderboard-table";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

function LeaderboardContent() {
  const searchParams = useSearchParams();
  const contestId = searchParams.get('contestId');
  
  const [images, setImages] = useState<PicVoteImage[]>([]);
  const [contest, setContest] = useState<Contest | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

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
      <div className="mb-4">
        <Button asChild variant="outline" size="sm">
          <Link href="/contests">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Contests
          </Link>
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
