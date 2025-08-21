
"use client";

import { useState, useEffect, useMemo } from "react";
import { collection, onSnapshot, doc, updateDoc, setDoc, addDoc } from "firebase/firestore";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import type { PicVoteImage } from "@/lib/types";
import { Header } from "@/components/header";
import { ImageCard } from "@/components/image-card";
import { Leaderboard } from "@/components/leaderboard";
import { UploadDialog } from "@/components/upload-dialog";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const [images, setImages] = useState<PicVoteImage[]>([]);
  const [hasVoted, setHasVoted] = useState(true);
  const [isUploadOpen, setUploadOpen] = useState(false);
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

  useEffect(() => {
    const lastVoteDate = localStorage.getItem("picvote_last_vote");
    if (lastVoteDate) {
      const today = new Date().toISOString().split("T")[0];
      if (lastVoteDate === today) {
        setHasVoted(true);
      } else {
        setHasVoted(false);
      }
    } else {
      setHasVoted(false);
    }
  }, []);

  const handleVote = async (id: string) => {
    if (hasVoted) {
      toast({
        variant: "destructive",
        title: "Already Voted!",
        description: "You can only vote once per day. Come back tomorrow!",
      });
      return;
    }

    const imageRef = doc(db, "images", id);
    const image = images.find(img => img.id === id);

    if (image) {
      try {
        await updateDoc(imageRef, { votes: image.votes + 1 });
        const today = new Date().toISOString().split("T")[0];
        localStorage.setItem("picvote_last_vote", today);
        setHasVoted(true);
        toast({
          title: "Vote Cast!",
          description: "Your vote has been counted. Thank you!",
        });
      } catch (error) {
        console.error("Error updating votes:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not cast your vote. Please try again.",
        });
      }
    }
  };

  const handleUpload = async (userName: string, imageName: string, dataUrl: string) => {
    setUploadOpen(false);
    toast({
      title: "Uploading Image...",
      description: "Please wait while your image is being uploaded.",
    });

    try {
      // 1. Create the document reference first to get an ID.
      const newImageDocRef = doc(collection(db, "images"));
      const newImageId = newImageDocRef.id;

      // 2. Use the ID for the storage path.
      const storageRef = ref(storage, `images/${newImageId}.png`);
      
      // 3. Upload the file.
      const snapshot = await uploadString(storageRef, dataUrl, 'data_url');
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      // 4. Create the document in Firestore with all the data.
      const newImage: Omit<PicVoteImage, 'id'> = {
        name: imageName,
        userName,
        url: downloadURL,
        votes: 0,
      };

      await setDoc(newImageDocRef, newImage);
      
      // The onSnapshot listener will automatically update the UI.

      toast({
        title: "Image Uploaded!",
        description: `${imageName} is now in the running.`,
      });
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: "Could not upload your image. Please try again.",
      });
    }
  };


  const sortedImages = useMemo(() => {
    return [...images].sort((a, b) => b.votes - a.votes);
  }, [images]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header onUploadClick={() => setUploadOpen(true)} />
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:w-3/4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-headline font-bold">Image Gallery</h2>
              {hasVoted && (
                 <p className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">You've voted today. Come back tomorrow!</p>
              )}
            </div>
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="rounded-lg border bg-card text-card-foreground shadow-sm aspect-square">
                     <div className="w-full h-full bg-muted animate-pulse rounded-lg"></div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {images.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                    {sortedImages.map((image) => (
                      <ImageCard
                        key={image.id}
                        image={image}
                        onVote={handleVote}
                        disabled={hasVoted}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 border-2 border-dashed rounded-lg">
                    <h3 className="text-2xl font-bold font-headline">No images yet!</h3>
                    <p className="text-muted-foreground mt-2">Be the first to upload a picture.</p>
                  </div>
                )}
              </>
            )}
          </div>
          <aside className="lg:w-1/4">
            <Leaderboard images={sortedImages} />
          </aside>
        </div>
      </main>
      <UploadDialog
        isOpen={isUploadOpen}
        onOpenChange={setUploadOpen}
        onUpload={handleUpload}
      />
    </div>
  );
}
