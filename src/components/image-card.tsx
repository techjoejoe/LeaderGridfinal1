
"use client";

import Image from "next/image";
import { Vote, Check } from "lucide-react";
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
};

export function ImageCard({ image, onVote, disabled, hasVoted, rank }: ImageCardProps) {
  const isPodium = rank < 3;

  const podiumClasses = {
    container: cn({
        "z-10": rank === 0,
        "self-end": rank === 1 || rank === 2,
    }),
    imageContainer: cn(
        "relative aspect-square rounded-full border-4 shadow-md overflow-visible transition-all",
        {
            "w-48 h-48 md:w-60 md:h-60": rank === 0, // 1st place
            "w-36 h-36 md:w-44 md:h-44": rank === 1, // 2nd place
            "w-32 h-32 md:w-36 md:h-36": rank === 2, // 3rd place
        }
    ),
    imageBorder: cn({
      "border-gold": rank === 0,
      "border-silver": rank === 1,
      "border-bronze": rank === 2,
      "border-card": !isPodium,
    }),
  };

  return (
    <div className={cn("flex flex-col items-center gap-3 transition-all hover:-translate-y-1 relative", isPodium ? podiumClasses.container : "")}>
      {rank === 0 && (
        <span className="absolute -top-16 text-9xl transform -rotate-12 animate-float z-20" role="img" aria-label="crown">👑</span>
      )}
      <div 
        className={cn(
          "relative",
          isPodium ? podiumClasses.imageContainer : "w-24 h-24 md:w-32 md:h-32"
        )}
      >
        <div className={cn("w-full h-full rounded-full", isPodium ? podiumClasses.imageBorder : "border-card", { 'overflow-hidden': rank !== 0 })}>
             {rank === 0 && <Sparkles />}
             <Image
                src={image.url}
                alt={image.name ?? 'photo'}
                fill
                className="object-cover rounded-full"
                sizes="(max-width: 768px) 30vw, 10vw"
                data-ai-hint={image.name.toLowerCase().split(' ').slice(0, 2).join(' ')}
             />
        </div>
      </div>
      <div className="text-center w-36">
        <p className="font-bold truncate text-sm" title={image.name}>{image.name}</p>
        <p className="text-xs text-muted-foreground truncate" title={`by ${image.userName || 'Anonymous'}`}>by {image.userName || 'Anonymous'}</p>
        <Button onClick={() => onVote(image.id)} disabled={disabled} size="sm" className="w-full mt-2" variant={hasVoted ? "secondary" : "outline"}>
          {hasVoted ? <Check /> : <Vote />}
          {hasVoted ? "Voted" : `Vote (${image.votes})`}
        </Button>
      </div>
    </div>
  );
}
