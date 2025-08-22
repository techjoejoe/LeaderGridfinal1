
"use client";

import { GoogleAuthProvider, OAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import Image from "next/image";

type SignInDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

export function SignInDialog({ isOpen, onOpenChange }: SignInDialogProps) {
  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      onOpenChange(false); // Close dialog on successful sign in
    } catch (error) {
      console.error("Error during Google sign-in:", error);
    }
  };

  const handleMicrosoftSignIn = async () => {
    const provider = new OAuthProvider('microsoft.com');
    try {
      await signInWithPopup(auth, provider);
      onOpenChange(false);
    } catch (error) {
      console.error("Error during Microsoft sign-in:", error);
    }
  };

  const handleAppleSignIn = async () => {
    const provider = new OAuthProvider('apple.com');
    try {
      await signInWithPopup(auth, provider);
      onOpenChange(false);
    } catch (error) {
      console.error("Error during Apple sign-in:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle className="font-headline text-center">Sign In</DialogTitle>
          <DialogDescription className="text-center">
            Choose a provider to sign in and start voting.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-4">
          <Button onClick={handleGoogleSignIn} variant="outline">
            <Image src="/google-logo.svg" alt="Google" width={20} height={20} className="mr-2"/>
            Sign In with Google
          </Button>
          <Button onClick={handleMicrosoftSignIn} variant="outline">
            <Image src="/microsoft-logo.svg" alt="Microsoft" width={20} height={20} className="mr-2"/>
            Sign In with Microsoft
          </Button>
          <Button onClick={handleAppleSignIn} variant="outline">
            <Image src="/apple-logo.svg" alt="Apple" width={20} height={20} className="mr-2"/>
            Sign In with Apple
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
