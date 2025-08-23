
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { collection, onSnapshot, doc, updateDoc, setDoc, getDoc, writeBatch, runTransaction } from "firebase/firestore";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { db, storage, auth } from "@/lib/firebase";
import type { PicVoteImage, UserVoteData } from "@/lib/types";
import { Header } from "@/components/header";
import { ImageCard } from "@/components/image-card";
import { UploadDialog } from "@/components/upload-dialog";
import { LeaderboardDialog } from "@/components/leaderboard-dialog";
import { SignInDialog } from "@/components/sign-in-dialog";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Upload, HelpCircle, ArrowDown } from "lucide-react";
import { onAuthStateChanged, User } from "firebase/auth";
import { getToday, isWeekday } from "@/lib/date-utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";


export default function Home() {
  const [images, setImages] = useState<PicVoteImage[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [userVoteData, setUserVoteData] = useState<UserVoteData | null>(null);
  
  const [isUploadOpen, setUploadOpen] = useState(false);
  const [isLeaderboardOpen, setLeaderboardOpen] = useState(false);
  const [isSignInOpen, setSignInOpen] = useState(false);

  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [votingImageId, setVotingImageId] = useState<string | null>(null);


  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (user) {
      const userVoteRef = doc(db, "user_votes", user.uid);
      const unsubscribeVotes = onSnapshot(userVoteRef, (doc) => {
        if (doc.exists()) {
          setUserVoteData(doc.data() as UserVoteData);
        } else {
          // Initialize if it doesn't exist
          const initialData: UserVoteData = {
            votesToday: 4,
            lastVotedDate: "1970-01-01",
            lastVotedWeekday: -1,
            imageVotes: {},
          };
          setDoc(doc.ref, initialData);
          setUserVoteData(initialData);
        }
      });
      return () => unsubscribeVotes();
    } else {
      setUserVoteData(null);
    }
  }, [user]);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = onSnapshot(collection(db, "images"), (snapshot) => {
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
        description: "Could not fetch images from the database.",
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  const handleVote = async (id: string) => {
    if (!user) {
      setSignInOpen(true);
      return;
    }
    setVotingImageId(id);

    try {
      await runTransaction(db, async (transaction) => {
        const userVoteRef = doc(db, "user_votes", user.uid);
        const imageRef = doc(db, "images", id);

        const userVoteDoc = await transaction.get(userVoteRef);
        const imageDoc = await transaction.get(imageRef);

        if (!imageDoc.exists()) {
          throw new Error("Image does not exist!");
        }

        const today = getToday();
        const currentDay = new Date().getDay(); // 0 (Sun) - 6 (Sat)
        
        let currentVoteData: UserVoteData;
        if (!userVoteDoc.exists()) {
          currentVoteData = {
            votesToday: 4,
            lastVotedDate: "1970-01-01",
            lastVotedWeekday: -1,
            imageVotes: {},
          };
        } else {
          currentVoteData = userVoteDoc.data() as UserVoteData;
        }

        // Reset votes if it's a new day
        if (currentVoteData.lastVotedDate !== today) {
          currentVoteData.votesToday = 4;
          currentVoteData.lastVotedDate = today;
        }

        // Rule 1: Check if it's a weekday
        if (!isWeekday(currentDay)) {
          throw new Error("Voting is only allowed on weekdays (Mon-Fri).");
        }
        
        // Rule 2: Check for daily vote limit
        if (currentVoteData.votesToday <= 0) {
          throw new Error("You have no votes left for today.");
        }

        // Rule 3: Check for per-image vote limit
        const imageVoteCount = currentVoteData.imageVotes[id] || 0;
        if (imageVoteCount >= 2) {
          throw new Error("You can only vote for the same image twice.");
        }

        // All checks passed, update votes
        const newImageData = { votes: imageDoc.data().votes + 1 };
        transaction.update(imageRef, newImageData);
        
        const newUserVoteData: UserVoteData = {
          ...currentVoteData,
          votesToday: currentVoteData.votesToday - 1,
          lastVotedDate: today,
          lastVotedWeekday: currentDay,
          imageVotes: {
            ...currentVoteData.imageVotes,
            [id]: imageVoteCount + 1,
          },
        };
        transaction.set(userVoteRef, newUserVoteData);
        
        toast({
          title: "Vote Cast!",
          description: `Your vote for ${imageDoc.data().name} has been counted.`,
        });
      });
    } catch (error: any) {
      console.error("Error casting vote:", error);
      toast({
        variant: "destructive",
        title: "Vote Failed",
        description: error.message || "Could not cast your vote. Please try again.",
      });
    } finally {
      setVotingImageId(null);
    }
  };

  const handleUpload = async (photoName: string, uploaderName: string, dataUrl: string) => {
    if (!user) {
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
        firstName: uploaderName || "Anonymous",
        lastName: "",
        url: downloadURL,
        votes: 0,
        uploaderUid: user.uid,
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

  const onUploadClick = () => {
    if (!user) {
      setSignInOpen(true);
    } else {
      setUploadOpen(true);
    }
  };
  
  const handleLetsGoClick = () => {
    const gallery = document.getElementById('gallery');
    if (gallery) {
      gallery.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const { votesLeft, canVoteToday, hasVotedForImage } = useMemo(() => {
    const today = getToday();
    const currentDay = new Date().getDay();
    
    if (!user || !userVoteData) {
      return { votesLeft: 0, canVoteToday: false, hasVotedForImage: () => false };
    }

    const votesLeft = userVoteData.lastVotedDate === today ? userVoteData.votesToday : 4;
    const canVoteTodayResult = isWeekday(currentDay) && votesLeft > 0;

    const hasVotedForImageFunc = (imageId: string) => (userVoteData.imageVotes?.[imageId] ?? 0) >= 2;

    return { votesLeft, canVoteToday: canVoteTodayResult, hasVotedForImage: hasVotedForImageFunc };

  }, [user, userVoteData]);


  const podiumImages = sortedImages.slice(0, 3);
  const otherImages = sortedImages.slice(3);

  const displayedPodium = useMemo(() => {
    if (podiumImages.length < 3) return podiumImages.map((image, index) => ({ image, rank: index }));
    const podiumMap = [
      { image: podiumImages[1], rank: 1 }, // 2nd place
      { image: podiumImages[0], rank: 0 }, // 1st place
      { image: podiumImages[2], rank: 2 }, // 3rd place
    ];
    return podiumMap;
  }, [podiumImages]);
  
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header 
        user={user}
        onSignInClick={() => setSignInOpen(true)}
        onLeaderboardClick={() => setLeaderboardOpen(true)}
      />
      <main className="container mx-auto px-4 py-8">
        <div className="w-full">
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
                      <li>Vote for your favorite photos uploaded by others.</li>
                      <li>Voting is open on weekdays (Mon-Fri).</li>
                      <li>You get 4 votes to cast each day.</li>
                      <li>You can vote for the same image a maximum of 2 times.</li>
                      <li>The top 3 photos with the most votes win a spot on the podium!</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            <div className="text-center mb-12">
               <Button size="lg" onClick={handleLetsGoClick}>
                  Let's Go!
                  <ArrowDown className="ml-2 h-4 w-4 animate-bounce" />
               </Button>
            </div>

            <div id="gallery" className="mb-6 scroll-mt-20">
              <div className="flex justify-between items-center mb-1">
                <h2 className="text-3xl font-headline font-bold">PicPick</h2>
                <div className="flex items-center gap-2">
                  <Button onClick={onUploadClick} className="bg-accent text-accent-foreground hover:bg-accent/90">
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Photo
                  </Button>
                </div>
              </div>
              <p className="text-lg text-muted-foreground">
                {user ? `You have ${votesLeft} votes left today. Happy picking!` : "Vote for your favorite photo!"}
              </p>
            </div>
            {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 items-end">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex flex-col items-center gap-3">
                    <div className="rounded-full border-4 border-card shadow-lg aspect-square w-full bg-muted animate-pulse"></div>
                    <div className="w-3/4 h-4 bg-muted animate-pulse rounded"></div>
                        <div className="w-1/2 h-4 bg-muted animate-pulse rounded"></div>
                    </div>
                ))}
                </div>
            ) : (
                <>
                {images.length > 0 ? (
                    <div className="flex flex-col gap-8">
                      {podiumImages.length > 0 && (
                          <div className="flex justify-center items-end gap-4 md:gap-8 mb-8 border-b pb-8 pt-12 min-h-[320px]">
                          {displayedPodium.map(({ image, rank }) => (
                              <ImageCard
                                key={image.id}
                                image={image}
                                rank={rank}
                                onVote={handleVote}
                                disabled={!canVoteToday || hasVotedForImage(image.id)}
                                hasVoted={hasVotedForImage(image.id)}
                                isVoting={votingImageId === image.id}
                              />
                          ))}
                          </div>
                      )}
                      {otherImages.length > 0 && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 items-end">
                          {otherImages.map((image, index) => (
                              <ImageCard
                                key={image.id}
                                image={image}
                                rank={index + 3}
                                onVote={handleVote}
                                disabled={!canVoteToday || hasVotedForImage(image.id)}
                                hasVoted={hasVotedForImage(image.id)}
                                isVoting={votingImageId === image.id}
                              />
                          ))}
                          </div>
                      )}
                    </div>
                ) : (
                    <div className="text-center py-16 border-2 border-dashed rounded-lg">
                    <h3 className="text-2xl font-bold font-headline">No photos yet!</h3>
                    <p className="text-muted-foreground mt-2">Be the first to upload a picture.</p>
                    </div>
                )}
                </>
            )}
        </div>
      </main>
      <UploadDialog
        isOpen={isUploadOpen}
        onOpenChange={setUploadOpen}
        onUpload={handleUpload}
      />
      <LeaderboardDialog
        isOpen={isLeaderboardOpen}
        onOpenChange={setLeaderboardOpen}
        images={sortedImages}
      />
      <SignInDialog
        isOpen={isSignInOpen}
        onOpenChange={setSignInOpen}
      />
    </div>
  );
}

    