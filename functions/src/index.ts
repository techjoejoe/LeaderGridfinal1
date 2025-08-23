
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { getStorage } from "firebase-admin/storage";

admin.initializeApp();
const db = admin.firestore();

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
