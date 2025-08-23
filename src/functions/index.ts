
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { getStorage } from "firebase-admin/storage";

admin.initializeApp();
const db = admin.firestore();

// Note: This function requires the Firebase project to be on the Blaze plan.
// The "Cloud Functions" and "Cloud Firestore" APIs must be enabled in the Google Cloud console.
export const onDeleteContest = functions.firestore
  .document("contests/{contestId}")
  .onDelete(async (snap, context) => {
    const { contestId } = context.params;
    const deletedContest = snap.data();

    if (!deletedContest) {
      functions.logger.log("No contest data found, exiting.");
      return;
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
              // Extract file path from URL. e.g., images%2F<image_id>.webp
              const urlParts = imageData.url.split("/o/");
              if (urlParts.length > 1) {
                  const filePathWithQuery = urlParts[1];
                  const filePath = decodeURIComponent(filePathWithQuery.split("?")[0]);
                  functions.logger.log(`Deleting from Storage: ${filePath}`);
                  const file = bucket.file(filePath);
                  file.delete().catch((err) => {
                    // Log error but don't block deletion process if file doesn't exist
                    if (err.code !== 404) {
                        functions.logger.error(`Failed to delete file ${filePath} from storage`, err);
                    }
                  });
              }
            } catch (err) {
                functions.logger.error("Error parsing image URL or deleting from storage", err);
            }
          }
          // Add image doc to batch delete
          batch.delete(doc.ref);
        });
    }

    // 2. Delete all user vote data for this contest
    // This requires querying the 'users' collection and then the 'user_votes' subcollection
    const usersSnapshot = await db.collection("users").get();
    functions.logger.log(`Checking ${usersSnapshot.size} users for vote data to delete.`);
    
    for (const userDoc of usersSnapshot.docs) {
        const userVoteRef = db.collection("users").doc(userDoc.id).collection("user_votes").doc(contestId);
        // We don't need to check if it exists, just add delete to the batch
        batch.delete(userVoteRef);
    }
    
    functions.logger.log("Committing batch delete for Firestore documents.");
    await batch.commit();
    functions.logger.log(`Successfully cleaned up contest ${contestId}`);
  });
