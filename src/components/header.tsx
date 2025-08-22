
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

const PicPickIcon = ({ className }: { className?: string }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
      <path d="m16 10 3-3" />
      <path d="m19 10-3-3" />
      <path d="m16.5 16.5 4 4" />
      <path d="M20.5 16.5 16.5 20.5" />
      <path d="m16 19 3-3" />
      <path d="m19 19-3-3" />
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );

const CameraCheckIcon = ({ className }: { className?: string }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
        <path d="M12 12V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-1.5" />
        <path d="m20.13 10.6-4.26 4.28a2 2 0 0 1-2.83 0L12 14" />
        <path d="M2 12a4 4 0 1 1 0-8 4 4 0 0 1 0 8Z" />
        <path d="M8 12a4 4 0 1 1 0-8 4 4 0 0 1 0 8Z" />
        <path d="M14 12a4 4 0 1 1 0-8 4 4 0 0 1 0 8Z" />
    </svg>
);


export function Header({ onUploadClick, onResetVotesClick, onLeaderboardClick }: HeaderProps) {
  return (
    <header className="bg-card border-b sticky top-0 z-10 shadow-sm">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <svg
            className="w-8 h-8 text-primary"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 12.3a1 1 0 0 0-1 1V15a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-1.7a1 1 0 0 0-1-1 1 1 0 0 0-1 1v1.7a4 4 0 0 0 4 4h12a4 4 0 0 0 4-4v-1.7a1 1 0 0 0-1-1Z" />
            <path d="m15.8 4.6 1.6-2.8a1 1 0 0 0-1.7-.9l-1.5 2.7" />
            <path d="m3 11.5 2.5-4.2a1 1 0 0 1 1.7.9L5 11" />
            <path d="m10.1 5.1 1.6-2.8a1 1 0 0 0-1.7-1l-1.6 2.8" />
            <path d="M12 12.5a2.5 2.5 0 0 1-4.4-2.2 2.5 2.5 0 0 1 4.9-1.3 2.5 2.5 0 0 1- .5 3.5Z" />
            <path d="m17 13 2.5-4.2a1 1 0 1 0-1.7-.9L16 11" />
            <path d="m20 9 1.5-2.6a1 1 0 1 0-1.7-1L18 8" />
          </svg>
          <h1 className="text-2xl font-headline font-bold text-card-foreground">
            PicPick
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
