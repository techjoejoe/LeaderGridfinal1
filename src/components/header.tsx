
import { Trophy, RotateCcw, Users, Award, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import { ThemeToggle } from "./theme-toggle";
import Image from 'next/image';
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
        <Link href="/" className="flex items-center gap-3 font-bold font-headline text-lg">
            <Image
                src="https://firebasestorage.googleapis.com/v0/b/picvote-h2ow0.firebasestorage.app/o/logo-light.png?alt=media&token=576a43d9-43ef-4307-868f-130e212228c1"
                alt="PicPick Logo Light"
                width={140}
                height={40}
                className="dark:hidden"
                priority
            />
            <Image
                src="https://firebasestorage.googleapis.com/v0/b/picvote-h2ow0.firebasestorage.app/o/logo-dark.png?alt=media&token=e3d5ffd5-84bb-41e1-8f58-885d394c667f"
                alt="PicPick Logo Dark"
                width={140}
                height={40}
                className="hidden dark:block"
                priority
            />
        </Link>
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
