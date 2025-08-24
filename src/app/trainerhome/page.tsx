
"use client";

import { Header } from "@/components/header";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useState, useEffect } from "react";
import { collection, addDoc, query, where, onSnapshot, serverTimestamp } from "firebase/firestore";
import { SignInDialog } from "@/components/sign-in-dialog";
import { Button } from "@/components/ui/button";
import { PlusCircle, Info } from "lucide-react";
import { CreateClassDialog } from "@/components/create-class-dialog";
import type { Class } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

function ClassCard({ classData }: { classData: Class }) {
  return (
    <Card className="flex flex-col transition-all hover:shadow-lg">
        <CardHeader className="flex-grow">
            <div className="flex justify-between items-start">
              <CardTitle>{classData.name}</CardTitle>
              <Badge variant="outline">{classData.inviteCode}</Badge>
            </div>
            <CardDescription>Select this class to manage its activities.</CardDescription>
        </CardHeader>
        <CardFooter>
            <Button asChild className="w-full">
              <Link href={`/class/${classData.id}`}>Enter Class</Link>
            </Button>
        </CardFooter>
    </Card>
  )
}


export default function TrainerHomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [isSignInOpen, setSignInOpen] = useState(false);
  const [isCreateClassOpen, setCreateClassOpen] = useState(false);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setLoading(false);
        setClasses([]);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (user) {
      setLoading(true);
      const q = query(collection(db, "classes"), where("trainerUid", "==", user.uid));
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const classesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Class));
        setClasses(classesData);
        setLoading(false);
      }, (error) => {
        console.error("Error fetching classes: ", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not fetch your classes.",
        });
        setLoading(false);
      });
      return () => unsubscribe();
    }
  }, [user, toast]);

  const handleCreateClass = async (className: string) => {
    if (!user) {
      setSignInOpen(true);
      return;
    }

    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    try {
      await addDoc(collection(db, "classes"), {
        name: className,
        trainerUid: user.uid,
        learnerUids: [],
        createdAt: serverTimestamp(),
        inviteCode: inviteCode,
      });

      toast({
        title: "Class Created!",
        description: `Your class "${className}" is ready.`,
      });
      setCreateClassOpen(false);
    } catch (error) {
      console.error("Error creating class:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not create the class. Please try again.",
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
                <p className="text-muted-foreground">Select a class or create a new one to begin.</p>
            </div>
            <Button onClick={() => user ? setCreateClassOpen(true) : setSignInOpen(true)} >
                <PlusCircle className="mr-2 h-4 w-4" />
                Create New Class
            </Button>
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
            ) : classes.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {classes.map((c) => <ClassCard key={c.id} classData={c} />)}
                </div>
            ) : (
                <div className="text-center py-16 border-2 border-dashed rounded-lg">
                    <h3 className="text-2xl font-bold font-headline">No classes yet!</h3>
                    <p className="text-muted-foreground mt-2">Get started by creating your first class.</p>
                </div>
            )
        ) : (
          <div className="text-center py-16 border-2 border-dashed rounded-lg">
            <h3 className="text-2xl font-bold font-headline">Please Sign In</h3>
            <p className="text-muted-foreground mt-2">You need to be signed in to view or create classes.</p>
            <Button onClick={() => setSignInOpen(true)} className="mt-4">Sign In</Button>
          </div>
        )}
      </main>
      <SignInDialog
        isOpen={isSignInOpen}
        onOpenChange={setSignInOpen}
      />
      <CreateClassDialog
        isOpen={isCreateClassOpen}
        onOpenChange={setCreateClassOpen}
        onCreate={handleCreateClass}
      />
    </>
  );
}
