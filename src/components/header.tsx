
import { Trophy, RotateCcw, Users, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from 'next/link';

type HeaderProps = {
  onUploadClick: () => void;
  onResetVotesClick: () => void;
  onLeaderboardClick: () => void;
};

export function Header({ onUploadClick, onResetVotesClick, onLeaderboardClick }: HeaderProps) {
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
           <Button onClick={onLeaderboardClick} variant="ghost" size="icon" className="h-9 w-9">
              <Users className="h-5 w-5" />
              <span className="sr-only">See Leaderboard</span>
           </Button>
           <Button onClick={onResetVotesClick} variant="outline">
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset Votes
          </Button>
           <Button asChild>
             <Link href="https://docs.paylocity.com/Madlib/teamMatty.html" target="_blank">
               <Award className="mr-2 h-4 w-4" />
               Make a Badge
             </Link>
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
