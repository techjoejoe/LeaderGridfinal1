
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ArrowLeft, User as UserIcon } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import type { Class, UserData } from "@/lib/types";

export default function ClassRosterPage() {
    const [user, setUser] = useState<User | null>(null);
    const [learners, setLearners] = useState<UserData[]>([]);
    const [classData, setClassData] = useState<Class | null>(null);
    const [loading, setLoading] = useState(true);
    const params = useParams<{ classId: string }>();
    const classId = params.classId;
    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => setUser(currentUser));
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!user || !classId) return;

        const fetchRoster = async () => {
            setLoading(true);
            const classRef = doc(db, "classes", classId);
            const classSnap = await getDoc(classRef);

            if (!classSnap.exists()) {
                toast({ variant: "destructive", title: "Error", description: "Class not found." });
                router.push("/trainerhome");
                return;
            }

            const currentClassData = { id: classSnap.id, ...classSnap.data() } as Class;
            setClassData(currentClassData);

            // Security check
            if (currentClassData.trainerUid !== user.uid) {
                toast({ variant: "destructive", title: "Access Denied" });
                router.push("/trainerhome");
                return;
            }

            if (currentClassData.learnerUids && currentClassData.learnerUids.length > 0) {
                const learnersQuery = query(collection(db, "users"), where("uid", "in", currentClassData.learnerUids));
                const learnersSnapshot = await getDocs(learnersQuery);
                const learnersData = learnersSnapshot.docs.map(d => d.data() as UserData);
                setLearners(learnersData);
            } else {
                setLearners([]);
            }

            setLoading(false);
        };

        fetchRoster();
    }, [user, classId, toast, router]);
    
    return (
        <>
            <Header user={user} onSignInClick={() => {}} />
            <main className="container mx-auto px-4 py-8">
                 <div className="flex justify-between items-start mb-6">
                    <div>
                        <Button asChild variant="outline" size="sm" className="mb-2">
                          <Link href={`/class/${classId}`}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Class Dashboard
                          </Link>
                        </Button>
                        <h1 className="text-3xl font-headline font-bold">Class Roster</h1>
                        <p className="text-muted-foreground">Select a student to view their details or add notes.</p>
                    </div>
                </div>

                {loading ? (
                     <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-40" />)}
                    </div>
                ) : learners.length > 0 ? (
                     <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {learners.map(learner => (
                            <Card key={learner.uid}>
                                <CardHeader>
                                    <UserIcon className="w-8 h-8 mb-2 text-muted-foreground" />
                                    <CardTitle>{learner.displayName}</CardTitle>
                                    <CardDescription>{learner.email}</CardDescription>
                                </CardHeader>
                                <CardFooter>
                                    <Button asChild variant="secondary" className="w-full">
                                        <Link href={`/class/${classId}/student/${learner.uid}`}>
                                            View Details
                                        </Link>
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 border-2 border-dashed rounded-lg">
                        <h3 className="text-2xl font-bold font-headline">No Students Yet</h3>
                        <p className="text-muted-foreground mt-2">Share the class invite code to get students enrolled.</p>
                        {classData && <p className="mt-4 font-mono text-lg p-2 bg-muted inline-block rounded-md">{classData.inviteCode}</p>}
                    </div>
                )}
            </main>
        </>
    )
}
