
"use client";

import Image from "next/image";
import { useRef } from "react";
import { Vote, Check, Loader2 } from "lucide-react";
import type { PicVoteImage } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Sparkles } from "@/components/sparkles";


type ImageCardProps = {
  image: PicVoteImage;
  onVote: (id: string) => void;
  disabled: boolean;
  hasVoted: boolean;
  rank: number;
  isVoting: boolean;
};

export function ImageCard({ image, onVote, disabled, hasVoted, rank, isVoting }: ImageCardProps) {
  const isPodium = rank < 3;
  const audioRef = useRef<HTMLAudioElement>(null);

  const podiumClasses = {
    container: cn({
        "z-20": rank === 0,
        "z-10": rank === 1,
        "self-end": rank === 1 || rank === 2,
    }),
    imageContainer: cn(
        "relative aspect-square rounded-full shadow-2xl transition-all p-1",
        {
            "w-48 h-48 md:w-60 md:h-60": rank === 0, // 1st place
            "w-36 h-36 md:w-44 md:h-44": rank === 1, // 2nd place
            "w-32 h-32 md:w-36 md:h-36": rank === 2, // 3rd place
            "overflow-visible": rank === 0,
        }
    ),
    imageBorder: cn("border-4 rounded-full w-full h-full", {
      "border-transparent": rank === 0,
      "border-silver": rank === 1,
      "border-bronze": rank === 2,
    }),
  };

  const nonPodiumClasses = {
      imageContainer: "w-32 h-32 md:w-36 md:h-36 rounded-full shadow-2xl p-1",
      imageBorder: "border-4 border-card rounded-full w-full h-full"
  };

  const uploaderName = [image.firstName, image.lastName].filter(Boolean).join(" ") || "Anonymous";

  const handleVoteClick = () => {
    if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(e => console.error("Error playing audio:", e));
    }
    onVote(image.id);
  }

  return (
    <div className={cn("flex flex-col items-center gap-3 transition-all duration-300 hover:scale-105 relative", isPodium ? podiumClasses.container : "")}>
        <audio ref={audioRef} src="data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA" preload="auto" />
      {rank === 0 && (
        <span className="absolute -top-16 text-8xl transform -rotate-12 animate-float z-20" role="img" aria-label="crown">👑</span>
      )}
      <div 
        className={cn(
          "relative",
          isPodium ? podiumClasses.imageContainer : nonPodiumClasses.imageContainer,
           isVoting && "animate-pulse-glow"
        )}
      >
        <div className="absolute inset-0 z-0">
          <div className={cn(
              "w-full h-full rounded-full",
              { "bg-gradient-to-br from-yellow-300 via-yellow-500 to-yellow-700": rank === 0 }
          )} />
        </div>
        <div className={cn(
          "relative",
           isPodium ? podiumClasses.imageBorder : nonPodiumClasses.imageBorder
        )}>
            <div className={cn("w-full h-full rounded-full relative bg-card shadow-lg", { 'overflow-hidden': rank !== 0 })}>
                {rank < 3 && (
                  <Sparkles
                    color={rank === 0 ? '#FFC700' : rank === 1 ? '#C0C0C0' : '#CD7F32'}
                  />
                )}
                <Image
                    src={image.url}
                    alt={image.name ?? 'photo'}
                    fill
                    className="object-cover rounded-full p-1"
                    sizes="(max-width: 768px) 30vw, 10vw"
                    data-ai-hint={image.name.toLowerCase().split(' ').slice(0, 2).join(' ')}
                />
            </div>
        </div>
      </div>
      <div className="text-center w-36">
        <p className="font-bold truncate text-sm" title={image.name}>{image.name}</p>
        <p className="text-xs text-muted-foreground truncate" title={`by ${uploaderName}`}>by {uploaderName}</p>
        <Button onClick={handleVoteClick} disabled={disabled || isVoting} size="sm" className="w-full mt-2" variant={hasVoted ? "secondary" : "outline"}>
            {isVoting ? <Loader2 className="animate-spin" /> : hasVoted ? <Check /> : <Vote />}
            {isVoting ? "Voting..." : hasVoted ? "Voted" : `Vote (${image.votes})`}
        </Button>
      </div>
    </div>
  );
}
