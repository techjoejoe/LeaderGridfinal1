
"use client";

import { Header } from "@/components/header";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { SignInDialog } from "@/components/sign-in-dialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trophy, Timer, MessageCircleQuestion } from "lucide-react";
import { DashboardCard } from "@/components/dashboard-card";
import type { Class } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Card, CardFooter, CardHeader } from "@/components/ui/card";
import Image from "next/image";


export default function ClassDashboardPage({ params }: { params: { classId: string } }) {
  const [user, setUser] = useState<User | null>(null);
  const [isSignInOpen, setSignInOpen] = useState(false);
  const [classData, setClassData] = useState<Class | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (user && params.classId) {
      setLoading(true);
      const docRef = doc(db, "classes", params.classId);
      const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as Omit<Class, 'id'>;
          // Security check: ensure the current user is the trainer for this class
          if (data.trainerUid === user.uid) {
            setClassData({ id: docSnap.id, ...data });
          } else {
            toast({
              variant: "destructive",
              title: "Permission Denied",
              description: "You do not have access to this class.",
            });
            router.push('/trainerhome');
          }
        } else {
          toast({
            variant: "destructive",
            title: "Class Not Found",
            description: "The requested class does not exist.",
          });
          router.push('/trainerhome');
        }
        setLoading(false);
      }, (error) => {
        console.error("Error fetching class: ", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not fetch class details.",
        });
        setLoading(false);
      });
      return () => unsubscribe();
    } else if (!user) {
        // Handle case where user is not logged in
        setLoading(false);
    }
  }, [user, params.classId, toast, router]);
  
  const tools = [
    { 
      icon: Trophy, 
      title: "PicPick Contest", 
      description: "Run a photo contest where learners vote for their favorite images.", 
      href: `/contests?classId=${params.classId}`,
      disabled: false
    },
    { 
      icon: <Image src="https://firebasestorage.googleapis.com/v0/b/picvote-h2ow0.firebasestorage.app/o/randomizer.png?alt=media&token=1acfebed-1dfe-4651-af05-23b96d3c66e6" alt="Randomizer Wheel" width={175} height={175} data-ai-hint="randomizer wheel" />, 
      description: "A spinning wheel to randomly select learners or topics.", 
      href: `/randomizer?classId=${params.classId}`,
      disabled: false
    },
    { 
      icon: <Image src="https://firebasestorage.googleapis.com/v0/b/picvote-h2ow0.firebasestorage.app/o/Livevote.png?alt=media&token=821a851e-8449-4ede-8005-9be175576be4" alt="Live Polls" width={175} height={175} data-ai-hint="live poll chart" />,
      description: "Engage your class with real-time polls and see instant results.", 
      href: `/polls?classId=${params.classId}`,
      disabled: true
    },
    { 
      icon: MessageCircleQuestion, 
      title: "Quizzes", 
      description: "Test knowledge with fun, interactive quizzes and leaderboards.", 
      href: `/quizzes?classId=${params.classId}`,
      disabled: true 
    },
    { 
      icon: Timer, 
      title: "Class Timer", 
      description: "A shared timer for activities, breaks, or presentations.", 
      href: `/timer?classId=${params.classId}`,
      disabled: true
    },
  ];

  return (
    <>
      <Header 
        user={user}
        onSignInClick={() => setSignInOpen(true)}
      />
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-start mb-6">
            <div>
                {loading ? (
                    <>
                        <Skeleton className="h-9 w-64 mb-2" />
                        <Skeleton className="h-5 w-48" />
                    </>
                ) : classData ? (
                    <>
                        <h1 className="text-3xl font-bold font-headline">{classData.name}</h1>
                        <p className="text-muted-foreground">Select a tool to engage your class.</p>
                    </>
                ) : (
                    <h1 className="text-3xl font-bold font-headline">Class Dashboard</h1>
                )}
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/trainerhome">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to All Classes
              </Link>
            </Button>
        </div>

        {user ? (
            loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(5)].map((_, i) => (
                        <Card key={i}>
                            <CardHeader><Skeleton className="h-6 w-3/4" /><Skeleton className="h-4 w-1/2 mt-2" /></CardHeader>
                            <CardFooter><Skeleton className="h-10 w-full" /></CardFooter>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tools.map((tool, index) => (
                        <DashboardCard 
                            key={index}
                            icon={tool.icon}
                            title={tool.title}
                            description={tool.description}
                            href={tool.href}
                            disabled={tool.disabled}
                        />
                    ))}
                </div>
            )
        ) : (
          <div className="text-center py-16 border-2 border-dashed rounded-lg">
            <h3 className="text-2xl font-bold font-headline">Please Sign In</h3>
            <p className="text-muted-foreground mt-2">You need to be signed in to access this class dashboard.</p>
            <Button onClick={() => setSignInOpen(true)} className="mt-4">Sign In</Button>
          </div>
        )}
      </main>
      <SignInDialog
        isOpen={isSignInOpen}
        onOpenChange={setSignInOpen}
      />
    </>
  );
}
