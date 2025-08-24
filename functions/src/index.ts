
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { getStorage } from "firebase-admin/storage";
import type { Poll, PollSession } from "../../src/lib/types";

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
    
    // Deleting the document will trigger the onDelete cloud function for cleanup.
    await contestRef.delete();

    functions.logger.log(`Successfully initiated deletion for contest ${contestId}`);
    return { success: true, message: "Contest deletion process started." };

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
export const onContestDeleted = functions.firestore
  .document("contests/{contestId}")
  .onDelete(async (snap, context) => {
    const { contestId } = context.params;
    functions.logger.log(`Starting cleanup for contest: ${contestId}`);

    const bucket = getStorage().bucket();
    const batch = db.batch();

    // 1. Delete all images associated with the contest
    const imagesQuery = db.collection("images").where("contestId", "==", contestId);
    const imagesSnapshot = await imagesQuery.get();

    if (imagesSnapshot.empty) {
      functions.logger.log("No images found for this contest.");
    } else {
      functions.logger.log(`Found ${imagesSnapshot.size} images to delete.`);
      imagesSnapshot.forEach((doc) => {
        const imageData = doc.data();
        if (imageData.url) {
          try {
            const urlParts = imageData.url.split("/o/");
            if (urlParts.length > 1) {
              const filePathWithQuery = urlParts[1];
              const filePath = decodeURIComponent(filePathWithQuery.split("?")[0]);
              functions.logger.log(`Deleting from Storage: ${filePath}`);
              const file = bucket.file(filePath);
              file.delete().catch((err) => {
                if (err.code !== 404) {
                  functions.logger.error(`Failed to delete file ${filePath} from storage`, err);
                }
              });
            }
          } catch (err) {
            functions.logger.error("Error parsing image URL or deleting from storage", err);
          }
        }
        batch.delete(doc.ref);
      });
    }

    // 2. Delete all user vote data for this contest
    const usersSnapshot = await db.collection("users").get();
    functions.logger.log(`Checking ${usersSnapshot.size} users for vote data to delete.`);
    
    usersSnapshot.docs.forEach(userDoc => {
      const userVoteRef = userDoc.ref.collection("user_votes").doc(contestId);
      batch.delete(userVoteRef);
    });

    // 3. Commit all batched writes
    await batch.commit();

    functions.logger.log(`Successfully cleaned up contest ${contestId}`);
  });

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

  const promises = contestsToDelete.docs.map(doc => {
    functions.logger.log(`Deleting contest ${doc.id} which ended on ${doc.data().endDate.toDate()}`);
    return doc.ref.delete(); // This will trigger the onContestDeleted function for each contest
  });

  await Promise.all(promises);
  
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
