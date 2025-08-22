
import { Trophy, RotateCcw, Users, Award, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import { ThemeToggle } from "./theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


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
           <ThemeToggle />
           <Button onClick={onUploadClick} className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Trophy className="mr-2 h-4 w-4" />
            Enter Contest
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-5 w-5" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onLeaderboardClick}>
                <Users className="mr-2 h-4 w-4" />
                <span>Leaderboard</span>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="https://docs.paylocity.com/Madlib/teamMatty.html" target="_blank">
                  <Award className="mr-2 h-4 w-4" />
                  <span>Make a Badge</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onResetVotesClick}>
                <RotateCcw className="mr-2 h-4 w-4" />
                <span>Reset Votes</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
