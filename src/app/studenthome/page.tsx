
"use client";

import { Header } from "@/components/header";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useState, useEffect } from "react";
import { collection, doc, query, where, onSnapshot, getDocs } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { SignInDialog } from "@/components/sign-in-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, LogIn } from "lucide-react";
import type { Class, UserData } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { useRouter } from "next/navigation";

function ClassCard({ classData }: { classData: Class }) {
  return (
    <Card className="flex flex-col transition-all hover:shadow-lg">
        <CardHeader className="flex-grow">
            <CardTitle>{classData.name}</CardTitle>
            <CardDescription>Taught by {classData.trainerName}</CardDescription>
        </CardHeader>
        <CardFooter>
            <Button asChild className="w-full">
              <Link href={`/class/${classData.id}/student`}>Enter Class</Link>
            </Button>
        </CardFooter>
    </Card>
  )
}

function JoinClassCard({ onJoin }: { onJoin: (code: string) => void }) {
    const [inviteCode, setInviteCode] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(inviteCode.trim()) {
            onJoin(inviteCode.trim().toUpperCase());
        }
    }
    
    return (
        <Card>
            <form onSubmit={handleSubmit}>
                <CardHeader>
                    <CardTitle>Join a New Class</CardTitle>
                    <CardDescription>Enter the invite code provided by your trainer.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Input 
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value)}
                        placeholder="INVITE CODE"
                        className="uppercase text-center font-bold tracking-widest"
                    />
                </CardContent>
                <CardFooter>
                    <Button type="submit" className="w-full">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Join Class
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}


export default function StudentHomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isSignInOpen, setSignInOpen] = useState(false);
  const [joinedClasses, setJoinedClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setLoading(false);
        setJoinedClasses([]);
        router.push("/studentlogin"); // Redirect to login if not signed in
      }
    });
    return () => unsubscribeAuth();
  }, [router]);

  useEffect(() => {
    if (user) {
      setLoading(true);
      const userDocRef = doc(db, "users", user.uid);
      const unsubscribeUser = onSnapshot(userDocRef, (docSnap) => {
        if(docSnap.exists()){
            const data = docSnap.data() as UserData;
            setUserData(data);
            if (data.role !== 'student') {
              toast({ variant: "destructive", title: "Access Denied" });
              router.push("/");
            }
        }
      });

      return () => unsubscribeUser();
    }
  }, [user, router, toast]);

  useEffect(() => {
    if (user && userData && userData.classIds && userData.classIds.length > 0) {
        const q = query(collection(db, "classes"), where("id", "in", userData.classIds));
        const unsubscribeClasses = onSnapshot(q, async (querySnapshot) => {
            const classesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Class));
            
            // Get trainer names
            const trainerIds = [...new Set(classesData.map(c => c.trainerUid))];
            const trainerDocs = await getDocs(query(collection(db, "users"), where("uid", "in", trainerIds)));
            const trainerMap = new Map(trainerDocs.docs.map(d => [d.id, d.data().displayName]));
            
            const classesWithTrainerNames = classesData.map(c => ({
              ...c,
              trainerName: trainerMap.get(c.trainerUid) || "Unknown Trainer"
            }));

            setJoinedClasses(classesWithTrainerNames);
            setLoading(false);
        });
        return () => unsubscribeClasses();
    } else if (user) {
        setLoading(false);
        setJoinedClasses([]);
    }
  }, [user, userData]);


  const handleJoinClass = async (inviteCode: string) => {
    if (!user) {
      setSignInOpen(true);
      return;
    }

    try {
        const functions = getFunctions();
        const joinClassCallable = httpsCallable(functions, 'joinClass');
        const result = await joinClassCallable({ inviteCode });
        const { success, message } = result.data as { success: boolean; message: string; };

        if (success) {
            toast({ title: "Success!", description: message });
        } else {
            throw new Error(message);
        }
    } catch (error: any) {
      console.error("Error joining class:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Could not join the class. Please check the code and try again.",
      });
    }
  };

  return (
    <>
      <Header 
        user={user}
        onSignInClick={() => setSignInOpen(true)}
      />
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
            <div>
                <h1 className="text-3xl font-bold font-headline">My Classes</h1>
                <p className="text-muted-foreground">Select a class to see activities.</p>
            </div>
        </div>

        {user ? (
            loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {[...Array(4)].map((_, i) => (
                        <Card key={i}>
                            <CardHeader><Skeleton className="h-6 w-3/4" /><Skeleton className="h-4 w-1/2 mt-2" /></CardHeader>
                            <CardFooter><Skeleton className="h-10 w-full" /></CardFooter>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {joinedClasses.map((c) => <ClassCard key={c.id} classData={c} />)}
                    <JoinClassCard onJoin={handleJoinClass} />
                </div>
            )
        ) : (
          <div className="text-center py-16 border-2 border-dashed rounded-lg">
            <h3 className="text-2xl font-bold font-headline">Please Sign In</h3>
            <p className="text-muted-foreground mt-2">You need to be signed in to view your classes.</p>
            <Button onClick={() => router.push('/studentlogin')} className="mt-4">
                <LogIn className="mr-2 h-4 w-4" />
                Go to Student Login
            </Button>
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
