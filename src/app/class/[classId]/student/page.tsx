
"use client";

import { Header } from "@/components/header";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users } from "lucide-react";
import type { Class, UserData } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { useRouter, useParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import Image from "next/image";

export default function StudentClassDashboardPage() {
  const params = useParams<{ classId: string }>();
  const classId = params.classId;

  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [classData, setClassData] = useState<Class | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if(currentUser) {
        const userDocRef = doc(db, "users", currentUser.uid);
        onSnapshot(userDocRef, (snap) => {
            if(snap.exists()) setUserData(snap.data() as UserData);
        })
      }
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (user && classId) {
      setLoading(true);
      const docRef = doc(db, "classes", classId);
      const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as Omit<Class, 'id'>;
          
          if (data.learnerUids?.includes(user.uid)) {
            setClassData({ id: docSnap.id, ...data });
          } else {
            toast({
              variant: "destructive",
              title: "Permission Denied",
              description: "You are not enrolled in this class.",
            });
            router.push('/studenthome');
          }
        } else {
          toast({
            variant: "destructive",
            title: "Class Not Found",
            description: "The requested class does not exist.",
          });
          router.push('/studenthome');
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
        setLoading(false);
    }
  }, [user, classId, toast, router]);

  const availableTools = [
      { name: "PicPick Contest", href: `/contests?classId=${classId}`, enabled: true },
      // Add other tools as they become available for students
  ]
  
  return (
    <>
      <Header 
        user={user}
        onSignInClick={() => {}}
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
                       <p className="text-muted-foreground">Select an activity to participate.</p>
                    </>
                ) : (
                    <h1 className="text-3xl font-bold font-headline">Class Dashboard</h1>
                )}
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/studenthome">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to All Classes
              </Link>
            </Button>
        </div>

        {user ? (
            loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {[...Array(4)].map((_, i) => (
                        <Card key={i}>
                            <CardHeader><Skeleton className="h-20 w-full" /></CardHeader>
                            <CardFooter><Skeleton className="h-10 w-full" /></CardFooter>
                        </Card>
                    ))}
                </div>
            ) : classData ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                   <Card>
                       <CardHeader>
                           <CardTitle>PicPick Contests</CardTitle>
                           <CardDescription>View and vote in photo contests for this class.</CardDescription>
                       </CardHeader>
                       <CardFooter>
                           <Button asChild className="w-full">
                               <Link href={`/contests?classId=${classId}`}>Go to Contests</Link>
                           </Button>
                       </CardFooter>
                   </Card>
                   {/* Add more cards for other student-facing tools here */}
                </div>
            ) : (
                 <div className="text-center py-16 border-2 border-dashed rounded-lg">
                    <h3 className="text-2xl font-bold font-headline">No Class Data</h3>
                    <p className="text-muted-foreground mt-2">Could not load data for this class.</p>
                </div>
            )
        ) : (
          <div className="text-center py-16 border-2 border-dashed rounded-lg">
            <h3 className="text-2xl font-bold font-headline">Please Sign In</h3>
            <p className="text-muted-foreground mt-2">You need to be signed in to access this class dashboard.</p>
          </div>
        )}
      </main>
    </>
  );
}

