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
const { getStorage } = require("firebase-admin/storage");
const admin = require("firebase-admin");
const sgMail = require("@sendgrid/mail");
const fetch = require("node-fetch");
const pdf = require("pdf-parse");
const { Pinecone } = require("@pinecone-database/pinecone");
const { OpenAIEmbeddings } = require("@langchain/openai");
const { RecursiveCharacterTextSplitter } = require("langchain/text_splitter");
const { Client } = require("langsmith");
const { PineconeStore } = require("@langchain/pinecone");
const { Document } = require("langchain/document");
const { v4: uuidv4 } = require("uuid");

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

// Function to get movie script from Scripts.com and index it in Pinecone
exports.getMovieScript = onCall(async (request) => {
  console.log("Starting getMovieScript function...");
  
  // Initialize LangSmith client for tracking
  const langsmith = new Client({
    apiKey: process.env.LANGSMITH_API_KEY,
    apiUrl: process.env.LANGSMITH_API_URL,
  });
  console.log("LangSmith client initialized");

  // Initialize OpenAI embeddings
  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY,
  });
  console.log("OpenAI embeddings initialized");

  // Initialize Pinecone client
  const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
  });
  console.log("Pinecone client initialized");

  // Start LangSmith run with required run_type
  const runId = uuidv4();
  await langsmith.createRun({
    id: runId,
    name: "get_movie_script",
    run_type: "embedding",
    inputs: { movieTitle: request.data.movieTitle },
  });
  console.log("LangSmith run created with ID:", runId);

  try {
    const { movieTitle, imdbId } = request.data;
    if (!movieTitle || !imdbId) {
      throw new HttpsError("invalid-argument", "Movie title and IMDB ID are required");
    }
    console.log("Processing request for movie:", movieTitle);

    // Initialize Cloud Storage
    const storage = getStorage();
    const bucket = storage.bucket();
    console.log("Cloud Storage initialized");

    // Search for movie on Scripts.com
    const searchUrl = `https://www.stands4.com/services/v2/scripts.php?uid=${
      process.env.SCRIPTS_USER_ID
    }&tokenid=${process.env.SCRIPTS_API_KEY}&term=${encodeURIComponent(
      movieTitle
    )}&format=json`;
    console.log("Searching Scripts.com for movie...");

    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();
    console.log("Received response from Scripts.com");

    // Handle both single result and multiple results cases
    let selectedMovie;
    if (searchData.result && Array.isArray(searchData.result)) {
      if (searchData.result.length === 0) {
        console.log("No scripts found for movie:", movieTitle);
        throw new HttpsError("not-found", "No script found for this movie");
      }
      selectedMovie = searchData.result[0];
      console.log(`Found ${searchData.result.length} scripts, selecting first one:`, selectedMovie.title);
    } else if (searchData.result) {
      selectedMovie = searchData.result;
      console.log("Found single script match:", selectedMovie.title);
    } else {
      console.log("No scripts found for movie:", movieTitle);
      throw new HttpsError("not-found", "No script found for this movie");
    }

    // Extract script ID from the link
    const scriptId = selectedMovie.link.split("/").pop();
    const movieSlug = selectedMovie.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-");
    console.log("Generated script ID:", scriptId);

    // Get Pinecone index
    const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX);
    console.log("Connected to Pinecone index");

    // Check if namespace already exists
    const stats = await pineconeIndex.describeIndexStats();
    const namespace = `movie-scripts-${scriptId}`;
    console.log("Checking if script already exists in Pinecone namespace:", namespace);

    if (stats.namespaces && stats.namespaces[namespace]) {
      console.log("Script already exists in Pinecone with", stats.namespaces[namespace].recordCount, "vectors");
      const result = {
        success: true,
        scriptId,
        title: selectedMovie.title,
        writer: selectedMovie.writer,
        subtitle: selectedMovie.subtitle,
        vectorCount: stats.namespaces[namespace].recordCount,
        fromCache: true,
      };

      // End LangSmith run with cached result
      await langsmith.updateRun(runId, {
        outputs: result,
        status: "completed",
        end_time: new Date().toISOString(),
      });
      console.log("Returning cached result");

      return result;
    }
    console.log("Script not found in Pinecone, proceeding with download");

    // Download PDF script
    const pdfUrl = `https://www.scripts.com/script-pdf-body.php?id=${scriptId}`;
    console.log("Downloading PDF from:", pdfUrl);
    const pdfResponse = await fetch(pdfUrl);
    const pdfBuffer = await pdfResponse.buffer();
    console.log("PDF downloaded successfully");

    // Save PDF to Cloud Storage
    const pdfFileName = `scripts/${movieSlug}/${scriptId}.pdf`;
    const pdfFile = bucket.file(pdfFileName);
    await pdfFile.save(pdfBuffer);
    console.log("PDF saved to Cloud Storage:", pdfFileName);

    // Parse PDF to text using pdf-parse
    console.log("Parsing PDF to text...");
    const pdfData = await pdf(pdfBuffer);
    console.log("PDF parsed successfully, text length:", pdfData.text.length);

    // Create document with metadata
    const doc = new Document({
      pageContent: pdfData.text,
      metadata: {
        movieTitle: selectedMovie.title,
        writer: selectedMovie.writer,
        scriptId: scriptId,
        subtitle: selectedMovie.subtitle,
      },
    });
    console.log("Created LangChain document with metadata");

    // Split text into chunks using LangChain's splitter
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    console.log("Splitting text into chunks...");

    // Split the document into chunks
    const docs = await splitter.splitDocuments([doc]);
    console.log("Text split into", docs.length, "chunks");

    // Create PineconeStore with the documents using LangChain
    console.log("Uploading chunks to Pinecone...");
    await PineconeStore.fromDocuments(docs, embeddings, {
      pineconeIndex,
      namespace,
      textKey: "text",
      metadata: {
        movieTitle: selectedMovie.title,
        writer: selectedMovie.writer,
        scriptId: scriptId,
      },
    });
    console.log("Chunks successfully uploaded to Pinecone");

    // Get TMDB movie data using IMDB ID
    console.log("Fetching TMDB data using IMDB ID:", imdbId);
    const tmdbFindResponse = await fetch(
      `https://api.themoviedb.org/3/find/${imdbId}?external_source=imdb_id`,
      {
        headers: {
          Authorization: `Bearer ${process.env.TMDB_ACCESS_TOKEN}`,
          accept: "application/json",
        },
      }
    );
    const tmdbFindData = await tmdbFindResponse.json();
    
    if (!tmdbFindData.movie_results || tmdbFindData.movie_results.length === 0) {
      console.log("Movie not found in TMDB");
      throw new HttpsError("not-found", "Movie not found in TMDB");
    }

    const tmdbMovie = tmdbFindData.movie_results[0];
    const tmdbId = tmdbMovie.id;
    console.log("Found TMDB movie:", tmdbMovie.title, "ID:", tmdbId);

    // Save movie poster if available
    let posterPath = null;
    if (tmdbMovie.poster_path) {
      const posterUrl = `https://image.tmdb.org/t/p/original${tmdbMovie.poster_path}`;
      console.log("Downloading movie poster from:", posterUrl);
      const posterResponse = await fetch(posterUrl);
      const posterBuffer = await posterResponse.buffer();
      
      const posterFileName = `posters/${movieSlug}/${tmdbId}.jpg`;
      const posterFile = bucket.file(posterFileName);
      await posterFile.save(posterBuffer);
      posterPath = posterFileName;
      console.log("Movie poster saved to:", posterFileName);
    }

    // Get movie credits to find characters
    console.log("Fetching movie credits from TMDB...");
    const creditsResponse = await fetch(
      `https://api.themoviedb.org/3/movie/${tmdbId}/credits`,
      {
        headers: {
          Authorization: `Bearer ${process.env.TMDB_ACCESS_TOKEN}`,
          accept: "application/json",
        },
      }
    );
    const creditsData = await creditsResponse.json();

    // Process cast members and save their profile images
    const characters = await Promise.all(
      creditsData.cast.map(async (actor) => {
        let profilePath = null;
        if (actor.profile_path) {
          const profileUrl = `https://image.tmdb.org/t/p/original${actor.profile_path}`;
          console.log("Downloading profile image for:", actor.character);
          const profileResponse = await fetch(profileUrl);
          const profileBuffer = await profileResponse.buffer();
          
          const profileFileName = `profiles/${movieSlug}/${tmdbId}/${actor.id}.jpg`;
          const profileFile = bucket.file(profileFileName);
          await profileFile.save(profileBuffer);
          profilePath = profileFileName;
          console.log("Profile image saved to:", profileFileName);
        }

        return {
          name: actor.character,
          profilePath,
          actorName: actor.name,
          actorId: actor.id,
          order: actor.order,
        };
      })
    );
    console.log("Processed", characters.length, "characters");

    const result = {
      success: true,
      scriptId,
      title: selectedMovie.title,
      writer: selectedMovie.writer,
      subtitle: selectedMovie.subtitle,
      pdfPath: pdfFileName,
      vectorCount: docs.length,
      fromCache: false,
      tmdb: {
        id: tmdbId,
        posterPath,
        characters,
      },
    };

    // End LangSmith run with success
    await langsmith.updateRun(runId, {
      outputs: result,
      status: "completed",
      end_time: new Date().toISOString(),
    });
    console.log("Function completed successfully");

    return result;
  } catch (error) {
    console.error("Error in getMovieScript:", error);

    // End LangSmith run with error
    await langsmith.updateRun(runId, {
      error: error.message,
      status: "failed",
      end_time: new Date().toISOString(),
    });
    console.log("Function failed with error:", error.message);

    throw new HttpsError("internal", error.message);
  }
});
