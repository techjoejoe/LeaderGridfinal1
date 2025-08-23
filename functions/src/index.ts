
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
    
    // Create promises for deleting user votes from subcollections
    usersSnapshot.docs.forEach(userDoc => {
      const userVoteRef = userDoc.ref.collection("user_votes").doc(contestId);
      batch.delete(userVoteRef);
    });

    // 3. Delete the contest itself
    batch.delete(contestRef);

    // 4. Commit all batched writes
    await batch.commit();

    functions.logger.log(`Successfully cleaned up and deleted contest ${contestId}`);
    return { success: true, message: "Contest and all its data have been successfully deleted." };

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
