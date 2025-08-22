import { Trophy, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

type HeaderProps = {
  onUploadClick: () => void;
  onResetVotesClick: () => void;
};

export function Header({ onUploadClick, onResetVotesClick }: HeaderProps) {
  return (
    <header className="bg-card border-b sticky top-0 z-10 shadow-sm">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Trophy className="w-8 h-8 text-primary" />
          <h1 className="text-2xl font-headline font-bold text-card-foreground">
            PicVote
          </h1>
        </div>
        <div className="flex items-center gap-2">
           <Button onClick={onResetVotesClick} variant="outline">
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset Votes
          </Button>
          <Button onClick={onUploadClick} className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Trophy className="mr-2 h-4 w-4" />
            Enter Contest
          </Button>
        </div>
      </div>
    </header>
  );
}
