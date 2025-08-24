
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
                src="https://firebasestorage.googleapis.com/v0/b/picvote-h2ow0.firebasestorage.app/o/JoeODesignLogo.png?alt=media&token=98b4c8d8-90ef-4af9-bd40-5025052bb4c2"
                alt="Joe O Design Logo"
                width={40}
                height={40}
                className="dark:hidden"
                priority
            />
            <Image
                src="https://firebasestorage.googleapis.com/v0/b/picvote-h2ow0.firebasestorage.app/o/JoeODesignLogo.png?alt=media&token=98b4c8d8-90ef-4af9-bd40-5025052bb4c2"
                alt="Joe O Design Logo"
                width={40}
                height={40}
                className="hidden dark:block"
                priority
            />
        </Link>
        <div className="flex items-center gap-2">
          <AuthButton user={user} onSignInClick={onSignInClick} />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
