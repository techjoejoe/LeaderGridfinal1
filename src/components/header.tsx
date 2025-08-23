
import { Users, MoreVertical, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import { ThemeToggle } from "./theme-toggle";
import Image from 'next/image';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { AuthButton } from "./auth-button";
import type { User } from "firebase/auth";


type HeaderProps = {
  user: User | null;
  onSignInClick: () => void;
};

export function Header({ user, onSignInClick }: HeaderProps) {
  return (
    <header className="bg-card border-b sticky top-0 z-10 shadow-sm">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-3 font-bold font-headline text-lg">
            <Image
                src="https://firebasestorage.googleapis.com/v0/b/picvote-h2ow0.firebasestorage.app/o/JoeODesignLogo.png?alt=media&token=2547d766-033a-4c8f-b187-555b65b4cf04"
                alt="Joe O Design Logo"
                width={140}
                height={40}
                className="dark:hidden"
                priority
            />
            <Image
                src="https://firebasestorage.googleapis.com/v0/b/picvote-h2ow0.firebasestorage.app/o/JoeODesignLogo.png?alt=media&token=2547d766-033a-4c8f-b187-555b65b4cf04"
                alt="Joe O Design Logo"
                width={140}
                height={40}
                className="hidden dark:block"
                priority
            />
        </Link>
        <div className="flex items-center gap-2">
          <AuthButton user={user} onSignInClick={onSignInClick} />
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-5 w-5" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href="/contests">
                  <Trophy className="mr-2 h-4 w-4" />
                  <span>Contests</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
