
"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from 'next/navigation';
import { collection, onSnapshot, doc, updateDoc, setDoc, getDoc, runTransaction, query, where, getDocs } from "firebase/firestore";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { db, auth, storage } from "@/lib/firebase";
import type { PicVoteImage, UserVoteData, Contest } from "@/lib/types";
import { Header } from "@/components/header";
import { ImageCard } from "@/components/image-card";
import { SignInDialog } from "@/components/sign-in-dialog";
import { UploadDialog } from "@/components/upload-dialog";
import { PasswordPromptDialog } from "@/components/password-prompt-dialog";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { HelpCircle, ArrowLeft, Trophy, Upload } from "lucide-react";
import { onAuthStateChanged, User } from "firebase/auth";
import { getToday } from "@/lib/date-utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";


function PicPickContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const contestId = searchParams.get('contestId');

  const [images, setImages] = useState<PicVoteImage[]>([]);
  const [contest, setContest] = useState<Contest | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userVoteData, setUserVoteData] = useState<UserVoteData | null>(null);
  
  const [isSignInOpen, setSignInOpen] = useState(false);
  const [isUploadOpen, setUploadOpen] = useState(false);
  const [isPasswordPromptOpen, setIsPasswordPromptOpen] = useState(false);
  const [accessGranted, setAccessGranted] = useState(false);

  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [votingImageId, setVotingImageId] = useState<string | null>(null);

  useEffect(() => {
    if (!contestId) {
      setLoading(false);
      return;
    }
  
    const sessionKey = `contest_access_${contestId}`;
  
    const contestRef = doc(db, "contests", contestId);
    const unsubscribeContest = onSnapshot(contestRef, (docSnap) => {
      if (docSnap.exists()) {
        const contestData = { ...docSnap.data(), id: docSnap.id } as Contest;
        setContest(contestData);
        
        if (contestData.hasPassword) {
          if (sessionStorage.getItem(sessionKey) === 'granted') {
            setAccessGranted(true);
          } else {
            setAccessGranted(false);
            setIsPasswordPromptOpen(true);
          }
        } else {
          setAccessGranted(true);
        }
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "This contest does not exist.",
        });
        setContest(null);
        setAccessGranted(false);
        router.push("/contests");
      }
    });
  
    return () => unsubscribeContest();
  }, [contestId, toast, router]);

  const handlePasswordSubmit = async (password: string) => {
    if (!contest) return;
    const contestRef = doc(db, "contests", contest.id);
    const contestDoc = await getDoc(contestRef);
    if (contestDoc.exists() && contestDoc.data().password === password) {
      const sessionKey = `contest_access_${contest.id}`;
      sessionStorage.setItem(sessionKey, 'granted');
      setIsPasswordPromptOpen(false);
      setAccessGranted(true);
    } else {
      toast({
        variant: "destructive",
        title: "Incorrect Password",
        description: "The password you entered is incorrect.",
      });
    }
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (user && contestId && accessGranted) {
      const userVoteRef = doc(db, "users", user.uid, "user_votes", contestId);
  
      const unsubscribeVotes = onSnapshot(userVoteRef, async (docSnap) => {
        const today = getToday();
        if (docSnap.exists()) {
          const data = docSnap.data() as UserVoteData;
          if (data.lastVotedDate !== today) {
            const resetData: UserVoteData = {
              votesToday: 4,
              imageVotes: {},
              lastVotedDate: today,
            };
            await setDoc(userVoteRef, resetData);
            setUserVoteData(resetData);
          } else {
            setUserVoteData(data);
          }
        } else {
          const initialData: UserVoteData = {
            votesToday: 4,
            lastVotedDate: today,
            imageVotes: {},
          };
          await setDoc(userVoteRef, initialData);
          setUserVoteData(initialData);
        }
      }, (error) => {
        console.error("Error fetching user vote data:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not fetch your voting data. Please refresh the page.",
        });
      });
  
      return () => unsubscribeVotes();
    } else {
      setUserVoteData(null);
    }
  }, [user, contestId, accessGranted, toast]);

  useEffect(() => {
    if (!contestId || !accessGranted) {
      setImages([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const imagesQuery = query(collection(db, "images"), where("contestId", "==", contestId));
    const unsubscribe = onSnapshot(imagesQuery, (snapshot) => {
      const imagesData = snapshot.docs.map(
        (doc) => ({ ...doc.data(), id: doc.id } as PicVoteImage)
      );
      setImages(imagesData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching images:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not fetch images for this contest.",
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [contestId, toast, accessGranted]);

  const handleVote = async (id: string) => {
    if (!user) {
      setSignInOpen(true);
      return;
    }
    if (!contestId) return;

    setVotingImageId(id);

    try {
      await runTransaction(db, async (transaction) => {
        const userVoteRef = doc(db, "users", user.uid, "user_votes", contestId);
        const imageRef = doc(db, "images", id);
        const userVoteDoc = await transaction.get(userVoteRef);
        const imageDoc = await transaction.get(imageRef);
        
        if (!imageDoc.exists()) throw new Error("Image does not exist!");
        
        const today = getToday();
        let currentVoteData: UserVoteData;
        
        if (!userVoteDoc.exists() || userVoteDoc.data().lastVotedDate !== today) {
          currentVoteData = { votesToday: 4, lastVotedDate: today, imageVotes: {} };
        } else {
          currentVoteData = userVoteDoc.data() as UserVoteData;
        }

        if (currentVoteData.votesToday <= 0) throw new Error("You have no votes left for today.");
        
        const imageVoteCount = currentVoteData.imageVotes[id] || 0;
        if (imageVoteCount >= 2) throw new Error("You can only vote for the same image twice.");

        transaction.update(imageRef, { votes: imageDoc.data().votes + 1 });
        
        const newUserVoteData: UserVoteData = {
          ...currentVoteData,
          votesToday: currentVoteData.votesToday - 1,
          lastVotedDate: today,
          imageVotes: { ...currentVoteData.imageVotes, [id]: imageVoteCount + 1 },
        };
        transaction.set(userVoteRef, newUserVoteData);
      });

      toast({ title: "Vote Cast!", description: "Your vote has been counted." });

    } catch (error: any) {
      console.error("Error casting vote:", error);
      toast({ variant: "destructive", title: "Vote Failed", description: error.message || "Could not cast your vote." });
    } finally {
      setVotingImageId(null);
    }
  };

  const handleUpload = async (photoName: string, dataUrl: string) => {
    if (!user || !contestId) {
      setSignInOpen(true);
      return;
    }
    setUploadOpen(false);
    toast({ title: "Uploading Photo...", description: "Please wait..." });

    try {
      const newImageDocRef = doc(collection(db, "images"));
      const storageRef = ref(storage, `images/${newImageDocRef.id}.webp`);
      const snapshot = await uploadString(storageRef, dataUrl, 'data_url');
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      await setDoc(newImageDocRef, {
        name: photoName,
        firstName: user.displayName || "Anonymous",
        lastName: "",
        url: downloadURL,
        votes: 0,
        uploaderUid: user.uid,
        contestId: contestId,
      } as Omit<PicVoteImage, 'id'>);
      
      toast({ title: "Photo Uploaded!", description: `${photoName} is now in the running.` });
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({ variant: "destructive", title: "Upload Failed", description: "Could not upload photo." });
    }
  };


  const sortedImages = useMemo(() => {
    return [...images].sort((a, b) => b.votes - a.votes);
  }, [images]);

  const { votesLeft, canVoteToday, hasVotedForImage } = useMemo(() => {
    if (!user || !userVoteData) {
      return { votesLeft: 0, canVoteToday: false, hasVotedForImage: () => false };
    }
    return {
      votesLeft: userVoteData.votesToday,
      canVoteToday: userVoteData.votesToday > 0,
      hasVotedForImage: (imageId: string) => (userVoteData.imageVotes?.[imageId] ?? 0) >= 2,
    };
  }, [user, userVoteData]);


  const podiumImages = sortedImages.slice(0, 3);
  const otherImages = sortedImages.slice(3);

  const displayedPodium = useMemo(() => {
    if (podiumImages.length < 3) return podiumImages.map((image, index) => ({ image, rank: index }));
    return [
      { image: podiumImages[1], rank: 1 },
      { image: podiumImages[0], rank: 0 },
      { image: podiumImages[2], rank: 2 },
    ];
  }, [podiumImages]);
  
  if (!contestId) {
    return (
        <div className="text-center py-16">
            <h2 className="text-2xl font-bold">No Contest Selected</h2>
            <p className="text-muted-foreground mt-2">Please select a contest to view the photos.</p>
            <Button asChild className="mt-4">
                <Link href="/contests">Go to Contests</Link>
            </Button>
        </div>
    )
  }
  
  if (!accessGranted) {
    return (
      <PasswordPromptDialog
        isOpen={isPasswordPromptOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) router.push('/contests');
          setIsPasswordPromptOpen(isOpen);
        }}
        onSubmit={handlePasswordSubmit}
        contestName={contest?.name ?? "this contest"}
      />
    )
  }


  return (
    <>
      <div className="w-full">
          <div className="flex justify-between items-center mb-4">
            <Button asChild variant="outline" size="sm">
              <Link href="/contests">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Contests
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm" href={`/leaderboard?contestId=${contestId}`}>
                <Link href={`/leaderboard?contestId=${contestId}`}>
                    <Trophy className="mr-2 h-4 w-4" />
                    View Leaderboard
                </Link>
              </Button>
              <Button onClick={() => user ? setUploadOpen(true) : setSignInOpen(true)} size="sm">
                <Upload className="mr-2 h-4 w-4" />
                Upload Photo
              </Button>
            </div>
          </div>
          <div className="mb-8 p-4 border rounded-lg bg-card">
            <Accordion type="single" collapsible defaultValue="item-1">
              <AccordionItem value="item-1">
                <AccordionTrigger>
                  <div className="flex items-center gap-2 font-headline text-lg">
                    <HelpCircle className="h-5 w-5" />
                    How It Works
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2">
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                    <li>Upload your best photo to enter the contest.</li>
                    <li>You get 4 votes to cast each day for this contest.</li>
                    <li>You can vote for the same image a maximum of 2 times.</li>
                    <li>The top 3 photos with the most votes win a spot on the podium!</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          <div id="gallery" className="mb-6 scroll-mt-20">
            <div className="flex justify-between items-center mb-1">
              <div>
                <h2 className="text-3xl font-headline font-bold">{contest?.name ?? 'PicPick'}</h2>
                <p className="text-lg text-muted-foreground">
                  {user ? `You have ${votesLeft} votes left today for this contest. Happy picking!` : "Sign in to vote for your favorite photo!"}
                </p>
              </div>
            </div>
            
          </div>
          {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-end">
              {[...Array(8)].map((_, i) => (
                  <div key={i} className="flex flex-col items-center gap-3">
                    <Skeleton className="w-36 h-36 rounded-full" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-9 w-32" />
                  </div>
              ))}
              </div>
          ) : (
              <>
              {images.length > 0 ? (
                  <div className="flex flex-col gap-8">
                    {podiumImages.length > 0 && (
                        <div className="flex justify-center items-end gap-4 md:gap-8 pt-16 pb-12 min-h-[320px] border-b">
                        {displayedPodium.map(({ image, rank }) => (
                            <ImageCard
                              key={image.id}
                              image={image}
                              rank={rank}
                              onVote={handleVote}
                              disabled={!user || !canVoteToday || hasVotedForImage(image.id)}
                              hasVoted={hasVotedForImage(image.id)}
                              isVoting={votingImageId === image.id}
                              imageShape={contest?.imageShape}
                            />
                        ))}
                        </div>
                    )}
                    {otherImages.length > 0 && (
                        <div className="flex justify-center my-16">
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-y-16 gap-x-12 items-end">
                            {otherImages.map((image, index) => (
                                <ImageCard
                                  key={image.id}
                                  image={image}
                                  rank={index + 3}
                                  onVote={handleVote}
                                  disabled={!user || !canVoteToday || hasVotedForImage(image.id)}
                                  hasVoted={hasVotedForImage(image.id)}
                                  isVoting={votingImageId === image.id}
                                  imageShape={contest?.imageShape}
                                />
                            ))}
                            </div>
                        </div>
                    )}
                  </div>
              ) : (
                  <div className="text-center py-16 border-2 border-dashed rounded-lg">
                  <h3 className="text-2xl font-bold font-headline">No photos yet!</h3>
                  <p className="text-muted-foreground mt-2">Be the first to upload a picture to this contest.</p>
                  </div>
              )}
              </>
          )}
      </div>
      <SignInDialog
        isOpen={isSignInOpen}
        onOpenChange={setSignInOpen}
      />
      <UploadDialog
        isOpen={isUploadOpen}
        onOpenChange={setUploadOpen}
        onUpload={handleUpload}
        uploaderName={user?.displayName ?? undefined}
        imageShape={contest?.imageShape}
      />
    </>
  );
}

export default function PicPickPage() {
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
              <PicPickContent />
            </main>
            <SignInDialog
                isOpen={isSignInOpen}
                onOpenChange={setSignInOpen}
            />
        </>
    );
}

    