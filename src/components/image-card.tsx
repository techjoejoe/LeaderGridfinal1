
"use client";

import Image from "next/image";
import { useState } from "react";
import { Vote, Check, Loader2 } from "lucide-react";
import type { PicVoteImage, ContestImageShape } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Sparkles } from "@/components/sparkles";
import { Confetti } from "@/components/confetti";


type ImageCardProps = {
  image: PicVoteImage;
  onVote: (id: string) => void;
  disabled: boolean;
  hasVoted: boolean;
  rank: number;
  isVoting: boolean;
  imageShape?: ContestImageShape;
};

export function ImageCard({ image, onVote, disabled, hasVoted, rank, isVoting, imageShape = 'circular' }: ImageCardProps) {
  const isPodium = rank < 3;
  const [showConfetti, setShowConfetti] = useState(false);

  const shapeClasses = {
    circular: 'rounded-full',
    square: 'rounded-md',
    original: 'rounded-lg'
  };

  const podiumContainerClasses = cn("drop-shadow-lg w-full", {
    "z-20 w-48 md:w-60": rank === 0,
    "z-10 w-36 md:w-44 self-end": rank === 1,
    "w-32 md:w-36 self-end": rank === 2,
  });

  const imageBorderClasses = cn("border-4 w-full h-full", shapeClasses[imageShape], {
    "border-transparent": isPodium && rank === 0,
    "border-silver dark:shadow-[0_0_15px_2px_hsl(var(--silver))]": isPodium && rank === 1,
    "border-bronze dark:shadow-[0_0_15px_2px_hsl(var(--bronze))]": isPodium && rank === 2,
    "border-card": !isPodium,
  });
  
  const handleVoteClick = () => {
    setShowConfetti(true);
    onVote(image.id);
  }

  const imageSizes = isPodium 
    ? "(max-width: 768px) 30vw, 240px" 
    : "(max-width: 768px) 25vw, (max-width: 1200px) 15vw, 144px";

  return (
    <div className={cn("flex flex-col items-center gap-3 relative", isPodium ? podiumContainerClasses : "w-full")}>
      {rank === 0 && (
        <span className="absolute -top-24 text-9xl transform -rotate-12 animate-float z-20 drop-shadow-lg" role="img" aria-label="crown">👑</span>
      )}
      <div 
        className={cn(
          "relative group transition-transform duration-300 w-full",
          isPodium ? "hover:scale-105" : "hover:scale-125",
          isVoting && "animate-pulse-glow"
        )}
      >
        <div className={cn(
          "absolute inset-0 z-0",
          shapeClasses[imageShape],
          { "bg-gradient-to-br from-yellow-300 via-yellow-500 to-yellow-700 dark:shadow-[0_0_25px_5px_hsl(var(--gold))]": rank === 0 }
        )} />
        <div className={cn(
          "relative h-full w-full p-1 shadow-2xl",
          shapeClasses[imageShape]
        )}>
           <div className={cn(
              "relative w-full bg-card shadow-lg", 
              shapeClasses[imageShape], 
              'overflow-hidden',
              imageShape === 'original' ? 'aspect-auto' : 'aspect-square'
            )}>
                {rank < 3 && (
                  <Sparkles
                    color={rank === 0 ? '#FFC700' : rank === 1 ? '#C0C0C0' : '#CD7F32'}
                  />
                )}
                <Image
                    src={image.url}
                    alt={image.name ?? 'photo'}
                    fill
                    className={cn("object-cover", shapeClasses[imageShape])}
                    sizes={imageSizes}
                    data-ai-hint={image.name.toLowerCase().split(' ').slice(0, 2).join(' ')}
                />
            </div>
        </div>
      </div>
      <div className="text-center w-36 relative">
        <p className="font-bold truncate text-sm" title={image.name}>{image.name}</p>
        <p className="text-xs text-muted-foreground truncate" title={`by ${image.firstName || 'Anonymous'}`}>by {image.firstName || 'Anonymous'}</p>
        <Button onClick={handleVoteClick} disabled={disabled || isVoting} size="sm" className="w-full mt-2" variant={"outline"}>
            {isVoting ? <Loader2 className="animate-spin" /> : <Vote />}
            {isVoting ? "Voting..." : `Vote (${image.votes})`}
        </Button>
         {showConfetti && (
          <Confetti onAnimationComplete={() => setShowConfetti(false)} />
        )}
      </div>
    </div>
  );
}

