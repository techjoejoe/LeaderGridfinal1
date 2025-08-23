
"use client";

import { useState, useEffect, useMemo } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import type { PicVoteImage } from "@/lib/types";
import { onAuthStateChanged, User } from "firebase/auth";
import { Header } from "@/components/header";
import { SignInDialog } from "@/components/sign-in-dialog";
import { LeaderboardTable } from "@/components/leaderboard-table";
import { Skeleton } from "@/components/ui/skeleton";
import { Users } from "lucide-react";

export default function LeaderboardPage() {
  const [images, setImages] = useState<PicVoteImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isSignInOpen, setSignInOpen] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = onSnapshot(collection(db, "images"), (snapshot) => {
      const imagesData = snapshot.docs.map(
        (doc) => ({ ...doc.data(), id: doc.id } as PicVoteImage)
      );
      setImages(imagesData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const sortedImages = useMemo(() => {
    return [...images].sort((a, b) => b.votes - a.votes);
  }, [images]);

  return (
    <>
      <Header 
        user={user}
        onSignInClick={() => setSignInOpen(true)}
      />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-4">
          <Users className="h-8 w-8" />
          <h1 className="text-3xl font-headline font-bold">Contest Leaderboard</h1>
        </div>
        <p className="text-lg text-muted-foreground mb-8">
          See who's in the lead. The rankings are updated in real-time.
        </p>

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
      </main>
      <SignInDialog
        isOpen={isSignInOpen}
        onOpenChange={setSignInOpen}
      />
    </>
  );
}
