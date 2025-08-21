
import Image from "next/image";
import { Heart, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PicVoteImage } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";

type ImageCardProps = {
  image: PicVoteImage;
  onVote: (id: string) => void;
  disabled: boolean;
};

export function ImageCard({ image, onVote, disabled }: ImageCardProps) {
  const dataAiHint = image.name.toLowerCase().split(' ').slice(0, 2).join(' ');

  return (
    <Card className="overflow-hidden group transition-all duration-300 hover:shadow-xl hover:scale-105">
      <CardHeader className="p-0">
        <div className="aspect-square relative overflow-hidden rounded-t-lg">
          <Image
            src={image.url}
            alt={image.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-110"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            data-ai-hint={dataAiHint}
          />
        </div>
      </CardHeader>
      <CardContent className="p-4 text-center">
        <CardTitle className="font-headline text-xl truncate">{image.name}</CardTitle>
        <CardDescription className="flex items-center justify-center gap-1 text-muted-foreground mt-1">
            <User className="h-4 w-4" />
            <span className="truncate">{image.userName || 'Anonymous'}</span>
        </CardDescription>
      </CardContent>
      <CardFooter className="flex justify-between items-center p-4 pt-0">
        <div className="text-lg font-bold text-primary">
          {image.votes} <span className="text-sm font-normal text-muted-foreground">votes</span>
        </div>
        <Button
          onClick={() => onVote(image.id)}
          disabled={disabled}
          variant="ghost"
          size="icon"
          className={cn(
            "rounded-full text-muted-foreground transition-colors duration-300",
            "hover:bg-accent/10 hover:text-accent",
            "active:scale-125",
            { "text-accent": disabled }
          )}
          aria-label={`Vote for ${image.name}`}
        >
          <Heart className={cn("h-6 w-6", { "fill-current": disabled })} />
        </Button>
      </CardFooter>
    </Card>
  );
}
