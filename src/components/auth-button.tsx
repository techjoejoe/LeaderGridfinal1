
"use client";

import { GoogleAuthProvider, OAuthProvider, signInWithPopup, signOut, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogIn, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Image from 'next/image';


type AuthButtonProps = {
  user: User | null;
};

export function AuthButton({ user }: AuthButtonProps) {

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error during Google sign-in:", error);
    }
  };

  const handleMicrosoftSignIn = async () => {
    const provider = new OAuthProvider('microsoft.com');
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error during Microsoft sign-in:", error);
    }
  }

  const handleAppleSignIn = async () => {
    const provider = new OAuthProvider('apple.com');
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error during Apple sign-in:", error);
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error during sign-out:", error);
    }
  };

  if (user) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={user.photoURL ?? ""} alt={user.displayName ?? "User"} />
                        <AvatarFallback>{user.displayName?.charAt(0) ?? 'U'}</AvatarFallback>
                    </Avatar>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>{user.displayName}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign Out</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
  }

  return (
    <div className="flex gap-2">
      <Button onClick={handleGoogleSignIn} variant="outline" size="sm">
          <Image src="/google-logo.svg" alt="Google" width={16} height={16} className="mr-2"/>
          Sign In
      </Button>
       <Button onClick={handleMicrosoftSignIn} variant="outline" size="sm">
          <Image src="/microsoft-logo.svg" alt="Microsoft" width={16} height={16} className="mr-2"/>
          Sign In
      </Button>
      <Button onClick={handleAppleSignIn} variant="outline" size="sm">
          <Image src="/apple-logo.svg" alt="Apple" width={16} height={16} className="mr-2"/>
          Sign In
      </Button>
    </div>
  );
}
