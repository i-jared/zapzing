/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
const {
  onDocumentCreated,
  onDocumentUpdated,
} = require("firebase-functions/v2/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");
const admin = require("firebase-admin");
const sgMail = require("@sendgrid/mail");

admin.initializeApp();

// Basic regex to validate email format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

exports.sendNotificationOnMessageCreate = onDocumentCreated(
  "messages/{messageId}",
  async (event) => {
    try {
      const snapshot = event.data;
      if (!snapshot) {
        console.log("No snapshot data found");
        return null;
      }
      const messageData = snapshot.data();
      if (!messageData) {
        console.log("No message data found");
        return null;
      }

      console.log("messageData", messageData);

      // 1) Extract relevant fields from the newly created message.
      const channelId = messageData.channel;
      const sender = messageData.sender; // { displayName, email, photoURL, uid }
      const senderUid = sender.uid;
      const messageText = messageData.text;

      // 2) Get the channel document to retrieve the workspaceId.
      const channelDoc = await getFirestore()
        .collection("channels")
        .doc(channelId)
        .get();

      if (!channelDoc.exists) {
        console.log(`Channel ${channelId} does not exist`);
        return null;
      }

      const channelData = channelDoc.data();
      // Prepare a list of FCM tokens from users who are eligible to receive the notification.
      const tokens = [];
      const workspaceId = channelData.workspaceId;

      if (channelData.dm) {
        console.log("DM channel");

        const userId = channelData.dm.find(
          (member) => member.uid !== senderUid
        );

        const userDoc = await getFirestore()
          .collection("users")
          .doc(userId)
          .get();
        const userData = userDoc.data();
        const { fcmToken, blockedUsers = [], mutedDMs = [] } = userData;

        if (
          fcmToken &&
          !blockedUsers.includes(senderUid) &&
          !mutedDMs.includes(channelId)
        ) {
          tokens.push(fcmToken);
        }
      } else {
        const workspaceDoc = await getFirestore()
          .collection("workspaces")
          .doc(workspaceId)
          .get();

        if (!workspaceDoc.exists) {
          console.log(`Workspace ${workspaceId} does not exist`);
          return null;
        }

        const workspaceData = workspaceDoc.data();
        const members = workspaceData.members.filter(
          (member) => member.uid !== senderUid
        );

        console.log("members", members);

        // 3) Query all users in that workspace.
        const usersSnapshot = await getFirestore()
          .collection("users")
          .where(admin.firestore.FieldPath.documentId(), "in", members)
          .get();

        if (usersSnapshot.empty) {
          console.log(`No users found for workspaceId: ${workspaceId}`);
          return null;
        }

        // 4) Filter out users who have either muted the channel or blocked the sender.
        usersSnapshot.forEach((userDoc) => {
          const userData = userDoc.data();
          const { blockedUsers = [], mutedChannels = [], fcmToken } = userData;

          // Skip if user has blocked the sender or muted the channel.
          if (
            blockedUsers.includes(senderUid) ||
            mutedChannels.includes(channelId)
          ) {
            return; // do not add token
          }

          // Collect the token if it exists.
          if (fcmToken) {
            tokens.push(fcmToken);
          }
        });
      }

      if (tokens.length === 0) {
        console.log("No valid FCM tokens to send to.");
        return null;
      }

      // 5) Build the notification payload.
      const message = {
        tokens,
        notification: {
          title: sender.displayName || "New Message",
          body: messageText,
        },
        webpush: {
          fcm_options: {
            link: "https://zappzingg.web.app",
          },
        },
        data: {
          channelId,
          senderUid,
          workspaceId,
        },
      };

      // 6) Send notifications to all collected tokens via FCM.
      const response = await getMessaging().sendEachForMulticast(message);
      console.log("FCM response:", response);

      return null;
    } catch (error) {
      console.error("Error sending FCM notification:", error);
      return null;
    }
  }
);

/**
 * Firestore Trigger: onInvitedEmailsUpdate
 * Triggered when a document in 'workspaces/{uid}' is updated.
 * Looks for newly added emails in `invitedEmails` array.
 */
exports.onInvitedEmailsUpdate7 = onDocumentUpdated(
  "workspaces/{uid}",
  async (event) => {
    try {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      const beforeData = event.data.before.data() || {};
      const afterData = event.data.after.data() || {};

      const beforeInvites = beforeData.invitedEmails || [];
      const afterInvites = afterData.invitedEmails || [];

      // Find any newly added emails (present in afterInvites but not in beforeInvites)
      const newlyAddedEmails = afterInvites.filter(
        (email) => !beforeInvites.includes(email)
      );

      if (!newlyAddedEmails.length) {
        console.log("No new invites added.");
        return null;
      }

      const workspaceUid = event.params.uid; // The doc ID in 'workspaces/{uid}'
      console.log(
        `Newly invited emails for workspace UID [${workspaceUid}]:`,
        newlyAddedEmails
      );

      // Send an invitation email for each new invite
      const sendEmailPromises = newlyAddedEmails.map(async (inviteeEmail) => {
        // Validate email format
        try {
          if (!emailRegex.test(inviteeEmail)) {
            console.warn(`Invalid email skipped: ${inviteeEmail}`);
            return null;
          }

          // Construct your email message
          const msg = {
            to: inviteeEmail,
            from: "jared.lambert@gauntletai.com", // Replace with your verified sender
            subject: "You've been invited to join a workspace on Zapzing!",
            text: `Sign up at https://zappzingg.web.app and use this workspace code: ${workspaceUid}`,
            html: `
          <p>You've been invited to join a workspace on <strong>Zapzing</strong>!</p>
          <p>Sign up at <a href="https://zappzingg.web.app">https://zappzingg.web.app</a> and use this workspace code:</p>
          <h3>${workspaceUid}</h3>
          <p>Thanks,<br>The Zapzing Team</p>
        `,
          };

          await sgMail.send(msg);
          console.log(`Email sent successfully to: ${inviteeEmail}`);
        } catch (error) {
          console.error(`Error sending email to ${inviteeEmail}:`, error);
        }
      });

      // Wait for all emails to be processed
      await Promise.all(sendEmailPromises);
    } catch (error) {
      console.error("Error sending emails:", error);
      return null;
    }

    return null;
  }
);

// Movie search function using OMDB API
exports.searchMovies = onCall(async (request) => {
  try {
    const searchTerm = request.data.searchTerm;

    if (!searchTerm || searchTerm.length < 2) {
      throw new Error("Search term must be at least 2 characters");
    }

    // Get API key from environment variables
    const apiKey = process.env.OMDB_API_KEY;
    if (!apiKey) {
      throw new Error("OMDB API key not configured");
    }

    // Call OMDB API search endpoint
    const response = await fetch(
      `http://www.omdbapi.com/?apikey=${apiKey}&s=${encodeURIComponent(
        searchTerm
      )}&type=movie`
    );

    const data = await response.json();

    if (data.Response === "False") {
      return {
        movies: [],
      };
    }

    // Map results to simplified movie objects
    const movies = data.Search.map((movie) => ({
      imdbId: movie.imdbID,
      title: movie.Title,
      year: movie.Year,
    }));

    return {
      movies: movies,
    };
  } catch (error) {
    console.error("Error searching movies:", error);
    throw new HttpsError("internal", error.message);
  }
});
