
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, onSnapshot, addDoc, serverTimestamp, orderBy } from "firebase/firestore";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, User as UserIcon } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import type { UserData, StudentNote } from "@/lib/types";
import { format } from "date-fns";

export default function StudentDetailPage() {
    const [user, setUser] = useState<User | null>(null);
    const [userData, setUserData] = useState<UserData | null>(null);
    const [studentData, setStudentData] = useState<UserData | null>(null);
    const [notes, setNotes] = useState<StudentNote[]>([]);
    const [newNote, setNewNote] = useState("");
    const [loading, setLoading] = useState(true);
    const params = useParams<{ classId: string, studentId: string }>();
    const { classId, studentId } = params;
    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if(currentUser) {
                const userDocRef = doc(db, "users", currentUser.uid);
                getDoc(userDocRef).then(snap => {
                    if (snap.exists()) setUserData(snap.data() as UserData);
                });
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!user || !classId || !studentId) return;

        const fetchStudentData = async () => {
            setLoading(true);
            const studentRef = doc(db, "users", studentId);
            const studentSnap = await getDoc(studentRef);

            if (!studentSnap.exists()) {
                toast({ variant: "destructive", title: "Error", description: "Student not found." });
                router.back();
                return;
            }
            setStudentData(studentSnap.data() as UserData);

            const notesQuery = query(
                collection(db, "notes"), 
                where("studentUid", "==", studentId),
                where("classId", "==", classId),
                orderBy("createdAt", "desc")
            );

            const unsubscribeNotes = onSnapshot(notesQuery, (snapshot) => {
                const notesData = snapshot.docs.map(d => ({...d.data(), id: d.id } as StudentNote));
                setNotes(notesData);
            });
            
            setLoading(false);
            return () => unsubscribeNotes();
        };

        fetchStudentData();
    }, [user, classId, studentId, toast, router]);

    const handleAddNote = async () => {
        if (!newNote.trim() || !user || !userData || userData.role !== 'trainer') return;
        
        try {
            await addDoc(collection(db, "notes"), {
                note: newNote,
                studentUid: studentId,
                classId: classId,
                trainerUid: user.uid,
                trainerName: user.displayName,
                createdAt: serverTimestamp()
            });
            toast({ title: "Note Added" });
            setNewNote("");
        } catch(error) {
            console.error("Error adding note: ", error);
            toast({ variant: "destructive", title: "Error", description: "Could not add note." });
        }
    };
    
    const canAddNote = userData?.role === 'trainer';

    return (
        <>
            <Header user={user} onSignInClick={() => {}} />
            <main className="container mx-auto px-4 py-8">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <Button asChild variant="outline" size="sm" className="mb-2">
                          <Link href={`/class/${classId}/roster`}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Roster
                          </Link>
                        </Button>
                        {loading ? (
                            <Skeleton className="h-10 w-64 mt-2" />
                        ) : (
                           <h1 className="text-3xl font-headline font-bold flex items-center gap-3">
                                <UserIcon className="w-8 h-8" />
                                {studentData?.displayName}'s Progress
                           </h1>
                        )}
                    </div>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    <div className="md:col-span-2 space-y-6">
                        <h2 className="text-2xl font-semibold">Notes</h2>
                         {canAddNote && (
                            <Card>
                                <CardHeader><CardTitle>Add a New Note</CardTitle></CardHeader>
                                <CardContent>
                                    <Textarea 
                                        value={newNote}
                                        onChange={(e) => setNewNote(e.target.value)}
                                        placeholder={`Add a note for ${studentData?.displayName}...`}
                                        rows={4}
                                    />
                                </CardContent>
                                <CardFooter>
                                    <Button onClick={handleAddNote} disabled={!newNote.trim()}>Save Note</Button>
                                </CardFooter>
                            </Card>
                         )}

                         {loading ? (
                            <div className="space-y-4">
                                <Skeleton className="h-24 w-full" />
                                <Skeleton className="h-24 w-full" />
                            </div>
                         ) : notes.length > 0 ? (
                            <div className="space-y-4">
                                {notes.map(note => (
                                    <Card key={note.id}>
                                        <CardContent className="pt-6">
                                            <p>{note.note}</p>
                                            <p className="text-xs text-muted-foreground mt-4">
                                                By {note.trainerName} on {format(note.createdAt.toDate(), "MMM d, yyyy")}
                                            </p>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                         ) : (
                            <div className="text-center py-16 border-2 border-dashed rounded-lg">
                                <h3 className="text-xl font-bold font-headline">No Notes Yet</h3>
                                <p className="text-muted-foreground mt-2">Add the first note for this student.</p>
                            </div>
                         )}
                    </div>
                    <div className="md:col-span-1">
                        <Card>
                            <CardHeader><CardTitle>Student Details</CardTitle></CardHeader>
                             <CardContent>
                                {loading ? (
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-3/4" />
                                        <Skeleton className="h-4 w-1/2" />
                                    </div>
                                ) : (
                                    <div className="space-y-2 text-sm">
                                        <p><strong>Name:</strong> {studentData?.displayName}</p>
                                        <p><strong>Email:</strong> {studentData?.email}</p>
                                        <p><strong>Role:</strong> {studentData?.role}</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>

            </main>
        </>
    )
}
