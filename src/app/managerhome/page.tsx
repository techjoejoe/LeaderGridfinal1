
"use client";

import { Header } from "@/components/header";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, doc, updateDoc, arrayUnion } from "firebase/firestore";
import { SignInDialog } from "@/components/sign-in-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle } from "lucide-react";
import type { UserData } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { useRouter } from "next/navigation";

function TrainerCard({ trainer }: { trainer: UserData }) {
  return (
    <Card className="flex flex-col transition-all hover:shadow-lg">
        <CardHeader className="flex-grow">
            <CardTitle>{trainer.displayName}</CardTitle>
            <CardDescription>{trainer.email}</CardDescription>
        </CardHeader>
        <CardFooter>
            <Button asChild className="w-full">
              <Link href={`/managerhome/trainer/${trainer.uid}`}>View Trainer</Link>
            </Button>
        </CardFooter>
    </Card>
  )
}

function AddTrainerCard({ onAdd }: { onAdd: (email: string) => void }) {
    const [trainerEmail, setTrainerEmail] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(trainerEmail.trim()) {
            onAdd(trainerEmail.trim());
            setTrainerEmail("");
        }
    }
    
    return (
        <Card>
            <form onSubmit={handleSubmit}>
                <CardHeader>
                    <CardTitle>Add a Trainer</CardTitle>
                    <CardDescription>Enter the email of a trainer to add them to your managed list.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Input 
                        value={trainerEmail}
                        onChange={(e) => setTrainerEmail(e.target.value)}
                        placeholder="trainer@example.com"
                        type="email"
                    />
                </CardContent>
                <CardFooter>
                    <Button type="submit" className="w-full">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Trainer
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}

export default function ManagerHomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isSignInOpen, setSignInOpen] = useState(false);
  const [managedTrainers, setManagedTrainers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setLoading(false);
        router.push("/");
      }
    });
    return () => unsubscribeAuth();
  }, [router]);
  
  useEffect(() => {
    if (user) {
      const userDocRef = doc(db, "users", user.uid);
      const unsubscribeUser = onSnapshot(userDocRef, (docSnap) => {
        if(docSnap.exists()){
            const data = docSnap.data() as UserData;
            setUserData(data);
            if (data.role !== 'manager') {
              toast({ 
                title: "Access Denied",
                description: "This page is for managers only."
              });
              router.push("/");
            }
        }
      });
      return () => unsubscribeUser();
    }
  }, [user, router, toast]);

  useEffect(() => {
    if (user && userData && userData.role === 'manager' && userData.managedTrainerUids && userData.managedTrainerUids.length > 0) {
      setLoading(true);
      const q = query(collection(db, "users"), where("uid", "in", userData.managedTrainerUids));
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const trainersData = querySnapshot.docs.map(doc => doc.data() as UserData);
        setManagedTrainers(trainersData);
        setLoading(false);
      }, (error) => {
        console.error("Error fetching trainers: ", error);
        setLoading(false);
      });
      return () => unsubscribe();
    } else if (user) {
      setLoading(false);
      setManagedTrainers([]);
    }
  }, [user, userData]);

  const handleAddTrainer = async (email: string) => {
    if (!user) return;
    try {
      const q = query(collection(db, "users"), where("email", "==", email), where("role", "==", "trainer"));
      const snapshot = await onSnapshot(q, (querySnapshot) => {
        if (querySnapshot.empty) {
          toast({ variant: "destructive", title: "Error", description: "No trainer found with that email address." });
          return;
        }
        const trainerDoc = querySnapshot.docs[0];
        const managerRef = doc(db, "users", user.uid);
        updateDoc(managerRef, {
            managedTrainerUids: arrayUnion(trainerDoc.id)
        });
        toast({ title: "Success!", description: `Trainer ${trainerDoc.data().displayName} added.` });
      })
      return () => snapshot();
    } catch (error) {
      console.error("Error adding trainer:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not add trainer." });
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
                <h1 className="text-3xl font-bold font-headline">Manager Dashboard</h1>
                <p className="text-muted-foreground">Manage your trainers and view student progress.</p>
            </div>
        </div>

        {user && userData?.role === 'manager' ? (
          loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-48" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {managedTrainers.map(trainer => <TrainerCard key={trainer.uid} trainer={trainer} />)}
              <AddTrainerCard onAdd={handleAddTrainer} />
            </div>
          )
        ) : (
          <div className="text-center py-16">
            <p>Loading or access denied...</p>
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
