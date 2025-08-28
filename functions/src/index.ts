
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { getStorage } from "firebase-admin/storage";
import type { Poll, PollSession, QuizSession, QuizSettings, QuizQuestion, QuizPlayer } from "../../src/lib/types";

admin.initializeApp();
const db = admin.firestore();
const rtdb = admin.database();

export const deleteContest = functions.https.onCall(async (data, context) => {
  const contestId = data.contestId;
  const uid = context.auth?.uid;

  if (!uid) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "You must be logged in to delete a contest."
    );
  }

  if (!contestId || typeof contestId !== 'string') {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "The function must be called with a valid 'contestId'."
    );
  }
  
  const contestRef = db.collection("contests").doc(contestId);

  try {
    const contestDoc = await contestRef.get();
    
    if (!contestDoc.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "The specified contest does not exist."
      );
    }
    
    const contestData = contestDoc.data();
    if (contestData?.creatorUid !== uid) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "You do not have permission to delete this contest."
      );
    }

    // All logic is now consolidated here to prevent race conditions.
    functions.logger.log(`Starting cleanup and deletion for contest: ${contestId}`);

    const bucket = getStorage().bucket();
    const batch = db.batch();

    // 1. Delete all images associated with the contest
    const imagesQuery = db.collection("images").where("contestId", "==", contestId);
    const imagesSnapshot = await imagesQuery.get();

    if (!imagesSnapshot.empty) {
      functions.logger.log(`Found ${imagesSnapshot.size} images to delete.`);
      imagesSnapshot.forEach((doc) => {
        const imageData = doc.data();
        if (imageData.storagePath) {
          try {
            functions.logger.log(`Deleting from Storage: ${imageData.storagePath}`);
            const file = bucket.file(imageData.storagePath);
            file.delete().catch((err) => {
              // Log error but don't fail the whole function if a file is already gone
              if (err.code !== 404) {
                functions.logger.error(`Failed to delete file ${imageData.storagePath} from storage`, err);
              }
            });
          } catch (err) {
            functions.logger.error("Error parsing image URL or deleting from storage", err);
          }
        }
        batch.delete(doc.ref); // Add image doc deletion to batch
      });
    }

    // 2. Delete all user vote data for this contest using a collection group query.
    const votesQuery = db.collectionGroup("votes").where("contestId", "==", contestId);
    const votesSnapshot = await votesQuery.get();
     if (!votesSnapshot.empty) {
      functions.logger.log(`Found ${votesSnapshot.size} vote documents to delete.`);
      votesSnapshot.forEach((doc) => {
        batch.delete(doc.ref); // Add vote doc deletion to batch
      });
    }
    
    // 3. Add the main contest document to the batch deletion
    batch.delete(contestRef);

    // 4. Commit all batched writes
    await batch.commit();

    functions.logger.log(`Successfully deleted contest ${contestId} and all associated data.`);
    return { success: true, message: "Contest and all its data have been deleted." };

  } catch (error: any) {
    functions.logger.error(`Error deleting contest ${contestId}:`, error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError(
      "internal",
      "An unexpected error occurred while trying to delete the contest."
    );
  }
});


// This function is triggered when a contest document is deleted.
// REMOVED to prevent race conditions. All logic is now in the `deleteContest` callable function.

// Scheduled function to run daily and check for contests to delete
export const scheduledContestCleanup = functions.pubsub.schedule('every 24 hours').onRun(async (context) => {
  functions.logger.log('Running scheduled contest cleanup');
  
  const now = admin.firestore.Timestamp.now();
  const twoDaysAgo = new admin.firestore.Timestamp(now.seconds - 172800, now.nanoseconds);

  const query = db.collection('contests').where('endDate', '<=', twoDaysAgo);
  const contestsToDelete = await query.get();

  if (contestsToDelete.empty) {
    functions.logger.log('No contests found for cleanup.');
    return null;
  }

  functions.logger.log(`Found ${contestsToDelete.size} contests to delete.`);

  const deletePromises = contestsToDelete.docs.map(async (doc) => {
    const contestId = doc.id;
    functions.logger.log(`Cleaning up contest ${contestId} which ended on ${doc.data().endDate.toDate()}`);
    const bucket = getStorage().bucket();
    const batch = db.batch();

    // The logic from deleteContest is replicated here for scheduled execution
    const imagesQuery = db.collection("images").where("contestId", "==", contestId);
    const imagesSnapshot = await imagesQuery.get();
    imagesSnapshot.forEach(imgDoc => {
      const imageData = imgDoc.data();
      if (imageData.storagePath) {
        bucket.file(imageData.storagePath).delete().catch(err => functions.logger.error(`Scheduled cleanup: Failed to delete file ${imageData.storagePath}`, err));
      }
      batch.delete(imgDoc.ref);
    });

    const votesQuery = db.collectionGroup("votes").where("contestId", "==", contestId);
    const votesSnapshot = await votesQuery.get();
    votesSnapshot.forEach(voteDoc => {
      batch.delete(voteDoc.ref);
    });

    batch.delete(doc.ref);
    return batch.commit();
  });

  await Promise.all(deletePromises);
  
  functions.logger.log('Scheduled contest cleanup finished.');
  return null;
});


// Live Polling Cloud Functions

// Helper to verify if user is the trainer of a class
const verifyClassTrainer = async (uid: string, classId: string) => {
  const classRef = db.collection('classes').doc(classId);
  const classDoc = await classRef.get();
  if (!classDoc.exists() || classDoc.data()?.trainerUid !== uid) {
    throw new functions.https.HttpsError('permission-denied', 'You are not authorized to perform this action.');
  }
};

export const createPollSession = functions.https.onCall(async (data, context) => {
  const uid = context.auth?.uid;
  if (!uid) throw new functions.https.HttpsError('unauthenticated', 'You must be logged in.');

  const { classId } = data;
  if (!classId) throw new functions.https.HttpsError('invalid-argument', 'Class ID is required.');
  
  await verifyClassTrainer(uid, classId);

  const sessionRef = rtdb.ref(`live-polls/${classId}`);
  const sessionCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  const newSession: PollSession = {
    id: classId,
    code: sessionCode,
    adminUid: uid,
    polls: {},
    isAcceptingVotes: true,
    createdAt: Date.now(),
  };

  await sessionRef.set(newSession);
  return { success: true, sessionId: classId };
});

export const createPoll = functions.https.onCall(async (data, context) => {
  const uid = context.auth?.uid;
  if (!uid) throw new functions.https.HttpsError('unauthenticated', 'You must be logged in.');
  
  const { sessionId, question, options } = data;
  if (!sessionId || !question || !options || !Array.isArray(options) || options.length < 2) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid poll data provided.');
  }
  
  await verifyClassTrainer(uid, sessionId);

  const pollId = `poll_${Date.now()}`;
  const newPoll: Poll = {
    id: pollId,
    question,
    options: options.map((opt, index) => ({
      id: String.fromCharCode(65 + index), // A, B, C...
      text: opt,
      votes: 0,
    })),
    isActive: false,
    createdAt: Date.now(),
  };

  const pollRef = rtdb.ref(`live-polls/${sessionId}/polls/${pollId}`);
  await pollRef.set(newPoll);

  return { success: true, pollId };
});

export const togglePollActive = functions.https.onCall(async (data, context) => {
  const uid = context.auth?.uid;
  if (!uid) throw new functions.https.HttpsError('unauthenticated', 'You must be logged in.');

  const { sessionId, pollId, isActive } = data;
  if (!sessionId || !pollId || typeof isActive !== 'boolean') {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid data provided.');
  }
  
  await verifyClassTrainer(uid, sessionId);

  const sessionRef = rtdb.ref(`live-polls/${sessionId}`);
  const updates: any = {};

  if (isActive) {
    // Deactivate any currently active poll
    const pollsSnapshot = await rtdb.ref(`live-polls/${sessionId}/polls`).get();
    if(pollsSnapshot.exists()) {
        const polls = pollsSnapshot.val();
        for (const pId in polls) {
            if (polls[pId].isActive) {
                updates[`/polls/${pId}/isActive`] = false;
            }
        }
    }
    updates[`/polls/${pollId}/isActive`] = true;
    updates['activePollId'] = pollId;
  } else {
    updates[`/polls/${pollId}/isActive`] = false;
    updates['activePollId'] = null;
  }

  await sessionRef.update(updates);
  return { success: true };
});

export const deletePoll = functions.https.onCall(async (data, context) => {
  const uid = context.auth?.uid;
  if (!uid) throw new functions.https.HttpsError('unauthenticated', 'You must be logged in.');

  const { sessionId, pollId } = data;
  if (!sessionId || !pollId) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid data provided.');
  }

  await verifyClassTrainer(uid, sessionId);

  const pollRef = rtdb.ref(`live-polls/${sessionId}/polls/${pollId}`);
  await pollRef.remove();
  
  // If the deleted poll was active, clear the activePollId
  const sessionRef = rtdb.ref(`live-polls/${sessionId}`);
  const activePollIdSnapshot = await sessionRef.child('activePollId').get();
  if (activePollIdSnapshot.exists() && activePollIdSnapshot.val() === pollId) {
      await sessionRef.update({ activePollId: null });
  }

  return { success: true };
});

export const submitVote = functions.https.onCall(async (data, context) => {
    // Note: This function allows unauthenticated calls for voters.
    // In a real-world app, you'd add more robust duplicate vote prevention (e.g., IP address tracking).
    const { sessionId, pollId, optionId } = data;
    if (!sessionId || !pollId || !optionId) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required vote data.');
    }

    const sessionRef = rtdb.ref(`live-polls/${sessionId}`);
    const sessionSnapshot = await sessionRef.get();
    if (!sessionSnapshot.exists()) {
        throw new functions.https.HttpsError('not-found', 'Session not found.');
    }
    
    const poll = sessionSnapshot.child(`polls/${pollId}`).val() as Poll;
    if (!poll || !poll.isActive) {
        throw new functions.https.HttpsError('failed-precondition', 'This poll is not active.');
    }

    const optionIndex = poll.options.findIndex(o => o.id === optionId);
    if (optionIndex === -1) {
        throw new functions.https.HttpsError('not-found', 'Invalid option selected.');
    }
    
    const optionRef = rtdb.ref(`live-polls/${sessionId}/polls/${pollId}/options/${optionIndex}/votes`);
    await optionRef.set(admin.database.ServerValue.increment(1));
    
    return { success: true };
});

export const joinClass = functions.https.onCall(async (data, context) => {
    const uid = context.auth?.uid;
    if (!uid) throw new functions.https.HttpsError('unauthenticated', 'You must be logged in to join a class.');
    
    const { inviteCode } = data;
    if (!inviteCode || typeof inviteCode !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'An invite code must be provided.');
    }

    const classesRef = db.collection('classes');
    const classQuery = classesRef.where('inviteCode', '==', inviteCode).limit(1);

    try {
        const snapshot = await classQuery.get();
        if (snapshot.empty) {
            return { success: false, message: 'Invalid invite code. No class found.' };
        }

        const classDoc = snapshot.docs[0];
        const classId = classDoc.id;
        const classData = classDoc.data();

        if (classData.trainerUid === uid) {
            return { success: false, message: 'You cannot join a class you are training.' };
        }

        const studentRef = db.collection('users').doc(uid);

        // Atomically add student to class and class to student
        const classUpdatePromise = classDoc.ref.update({
            learnerUids: admin.firestore.FieldValue.arrayUnion(uid)
        });

        const studentUpdatePromise = studentRef.update({
            classIds: admin.firestore.FieldValue.arrayUnion(classId)
        });
        
        await Promise.all([classUpdatePromise, studentUpdatePromise]);
        
        return { success: true, message: `Successfully joined "${classData.name}"!` };

    } catch (error) {
        functions.logger.error('Error joining class:', error);
        throw new functions.https.HttpsError('internal', 'An unexpected error occurred while trying to join the class.');
    }
});


// Quiz Battle Functions

export const createQuizSession = functions.https.onCall(async (data, context) => {
    const uid = context.auth?.uid;
    if (!uid) throw new functions.https.HttpsError('unauthenticated', 'You must be logged in to host a quiz.');

    const { classId, settings, questions } = data as { classId: string, settings: QuizSettings, questions: QuizQuestion[] };
    if (!classId || !settings || !questions || questions.length === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required data to create a quiz session.');
    }

    await verifyClassTrainer(uid, classId);

    // Validate that for every question, the correct answer is present in the answers array
    for (const q of questions) {
        if (!q.answers.includes(q.correctAnswer)) {
            throw new functions.https.HttpsError('invalid-argument', `Question "${q.question}" is missing its correct answer from the list of possible answers.`);
        }
    }

    const roomCode = Math.floor(1000 + Math.random() * 9000).toString();
    const sessionRef = rtdb.ref(`quiz-battles/${roomCode}`);

    const newSession: QuizSession = {
        id: roomCode,
        roomCode,
        hostUid: uid,
        classId,
        settings,
        questions,
        currentQuestion: -1, // -1 means lobby, 0 is the first question
        gameState: 'waiting',
        players: {},
        answers: {},
        createdAt: Date.now(),
    };

    await sessionRef.set(newSession);

    return { success: true, roomCode };
});


export const joinQuizSession = functions.https.onCall(async (data, context) => {
    const { roomCode, playerName } = data as { roomCode: string, playerName: string };

    if (!roomCode || !playerName) {
        throw new functions.https.HttpsError('invalid-argument', 'Room code and player name are required.');
    }

    const sessionRef = rtdb.ref(`quiz-battles/${roomCode}`);
    const sessionSnapshot = await sessionRef.get();

    if (!sessionSnapshot.exists()) {
        throw new functions.https.HttpsError('not-found', 'Quiz session not found.');
    }

    const session = sessionSnapshot.val() as QuizSession;
    if (session.gameState !== 'waiting') {
        throw new functions.https.HttpsError('failed-precondition', 'This quiz is no longer accepting players.');
    }

    const playerId = `player_${Math.random().toString(36).substring(2, 10)}`;
    const newPlayer: QuizPlayer = {
        id: playerId,
        name: playerName,
        score: 0,
    };

    await sessionRef.child(`players/${playerId}`).set(newPlayer);

    return { success: true, playerId, session: sessionSnapshot.val() };
});

    