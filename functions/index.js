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
const { ChatOpenAI } = require("@langchain/openai");
const {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
} = require("@langchain/core/prompts");
const { StringOutputParser } = require("@langchain/core/output_parsers");

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
    const { movieTitle, imdbId, channelId } = request.data;
    if (!movieTitle || !imdbId || !channelId) {
      throw new HttpsError(
        "invalid-argument",
        "Movie title, IMDB ID, and channel ID are required"
      );
    }
    console.log("Processing request for movie:", movieTitle);

    // Initialize vector count
    let vectorCount = 0;

    // Check Firestore first for existing movie data
    const db = getFirestore();
    console.log("Checking Firestore for existing movie data...");

    // Get movie by IMDB ID
    const movieDoc = await db.collection("movies").doc(imdbId).get();
    let existingMovieData = null;
    let tmdbId = null;
    let posterPath = null;
    let characters = null;

    if (movieDoc.exists) {
      existingMovieData = movieDoc.data();
      tmdbId = existingMovieData.tmdbId;
      posterPath = existingMovieData.posterPath;
      console.log("Found existing movie data in Firestore");

      // If we have both script and characters, we can return early
      if (existingMovieData.hasScript && existingMovieData.hasCharacters) {
        console.log("Movie already has script and characters");

        // Get existing bots
        const botsSnapshot = await db
          .collection("bots")
          .where("movieId", "==", imdbId)
          .get();

        characters = botsSnapshot.docs.map((doc) => ({
          name: doc.data().characterName,
          profilePath: doc.data().profilePicture,
          actorName: doc.data().actorName,
          actorId: doc.data().actorId,
        }));

        // Update channel's activeMovies
        console.log("Updating channel's activeMovies...");
        const channelRef = db.collection("channels").doc(channelId);
        await channelRef.set(
          {
            activeMovies: {
              [imdbId]: {
                imdbId,
                posterPath,
                title: existingMovieData.title,
                activatedAt: admin.firestore.FieldValue.serverTimestamp(),
              },
            },
          },
          { merge: true }
        );
        console.log("Channel activeMovies updated");

        // Create system message announcing the movie characters
        console.log("Creating system message...");
        const messageRef = db.collection("messages").doc();
        await messageRef.set({
          text: `Added characters from "${existingMovieData.title}" to the channel! You can now chat with them about the movie.`,
          sender: {
            uid: "system",
            displayName: "System",
            photoURL: null,
            email: null,
          },
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          channel: channelId,
          workspaceId: (await channelRef.get()).data().workspaceId,
          isSystem: true,
          movieData: {
            movieId: tmdbId.toString(),
            imdbId,
            title: existingMovieData.title,
            posterPath,
            characters: characters.map((c) => ({
              name: c.name,
              actorName: c.actorName,
              profilePath: c.profilePath,
            })),
          },
        });
        console.log("System message created");

        const result = {
          success: true,
          scriptId: existingMovieData.scriptId,
          title: existingMovieData.title,
          vectorCount: vectorCount,
          fromCache: true,
          tmdb: {
            id: tmdbId,
            posterPath,
            characters,
          },
        };

        // End LangSmith run with cached result
        await langsmith.updateRun(runId, {
          outputs: result,
          status: "completed",
          end_time: new Date().toISOString(),
        });
        console.log("Returning cached result from Firestore");

        return result;
      }

      // If we have characters but no script
      if (existingMovieData.hasCharacters) {
        console.log("Using existing character data");
        const botsSnapshot = await db
          .collection("bots")
          .where("movieId", "==", imdbId)
          .get();

        characters = botsSnapshot.docs.map((doc) => ({
          name: doc.data().characterName,
          profilePath: doc.data().profilePicture,
          actorName: doc.data().actorName,
          actorId: doc.data().actorId,
        }));
      }

      console.log("Found partial movie data, will update as needed");
    }

    // Initialize Cloud Storage
    const storage = getStorage();
    const bucket = storage.bucket();
    console.log("Cloud Storage initialized");

    // Only search for script if we don't have it
    let scriptId = existingMovieData?.scriptId;
    let selectedMovie = null;

    if (!existingMovieData?.hasScript) {
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
      if (searchData.result && Array.isArray(searchData.result)) {
        if (searchData.result.length === 0) {
          console.log("No scripts found for movie:", movieTitle);
          throw new HttpsError("not-found", "No script found for this movie");
        }
        selectedMovie = searchData.result[0];
        console.log(
          `Found ${searchData.result.length} scripts, selecting first one:`,
          selectedMovie.title
        );
      } else if (searchData.result) {
        selectedMovie = searchData.result;
        console.log("Found single script match:", selectedMovie.title);
      } else {
        console.log("No scripts found for movie:", movieTitle);
        throw new HttpsError("not-found", "No script found for this movie");
      }

      // Extract script ID from the link
      scriptId = selectedMovie.link.split("/").pop();
      console.log("Generated script ID:", scriptId);
    }

    const movieSlug = (existingMovieData?.title || selectedMovie.title)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-");

    // Only process script if we don't have it
    if (!existingMovieData?.hasScript) {
      // Get Pinecone index
      const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX);
      console.log("Connected to Pinecone index");

      // Check if namespace already exists
      const stats = await pineconeIndex.describeIndexStats();
      const namespace = `movie-scripts-${imdbId}`;
      console.log(
        "Checking if script already exists in Pinecone namespace:",
        namespace
      );

      if (stats.namespaces && stats.namespaces[namespace]) {
        vectorCount = stats.namespaces[namespace].recordCount || 0;
      }

      if (!(stats.namespaces && stats.namespaces[namespace])) {
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
        console.log(
          "PDF parsed successfully, text length:",
          pdfData.text.length
        );

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

        // Set vector count to number of chunks
        vectorCount = docs.length;

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
      }
    }

    // Only fetch TMDB data if we don't have it
    if (!tmdbId) {
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

      if (
        !tmdbFindData.movie_results ||
        tmdbFindData.movie_results.length === 0
      ) {
        console.log("Movie not found in TMDB");
        throw new HttpsError("not-found", "Movie not found in TMDB");
      }

      const tmdbMovie = tmdbFindData.movie_results[0];
      tmdbId = tmdbMovie.id;
      console.log("Found TMDB movie:", tmdbMovie.title, "ID:", tmdbId);

      // Save movie poster if available and we don't have it
      if (tmdbMovie.poster_path && !posterPath) {
        const posterUrl = `https://image.tmdb.org/t/p/original${tmdbMovie.poster_path}`;
        console.log("Downloading movie poster from:", posterUrl);
        const posterResponse = await fetch(posterUrl);
        const posterBuffer = await posterResponse.buffer();

        posterPath = `posters/${movieSlug}/${tmdbId}.jpg`;
        const posterFile = bucket.file(posterPath);
        await posterFile.save(posterBuffer);
        console.log("Movie poster saved to:", posterPath);
      }
    }

    // Only fetch character data if we don't have it
    if (!characters) {
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
      characters = await Promise.all(
        creditsData.cast.slice(0, 20).map(async (actor) => {
          let profilePath = null;
          if (actor.profile_path) {
            const profileUrl = `https://image.tmdb.org/t/p/original${actor.profile_path}`;
            console.log("Downloading profile image for:", actor.character);
            const profileResponse = await fetch(profileUrl);
            const profileBuffer = await profileResponse.buffer();

            profilePath = `bot_profiles_pictures/${movieSlug}/${tmdbId}/${actor.id}.jpg`;
            const profileFile = bucket.file(profilePath);
            await profileFile.save(profileBuffer);
            console.log("Profile image saved to:", profilePath);
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
    }

    // Save movie information to Firestore
    console.log("Saving movie information to Firestore...");

    const movieRef = db.collection("movies").doc(imdbId);
    await movieRef.set(
      {
        tmdbId,
        imdbId,
        title: existingMovieData?.title || selectedMovie.title,
        posterPath,
        scriptId,
        hasScript: true,
        hasCharacters: true,
        createdAt:
          existingMovieData?.createdAt ||
          admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    console.log("Movie information saved to Firestore");

    // Save character bots to Firestore if we just fetched them
    if (!existingMovieData?.hasCharacters) {
      console.log("Saving character bots to Firestore...");
      const botsRef = db.collection("bots");
      await Promise.all(
        characters.map(async (character) => {
          const botId = uuidv4();
          await botsRef.doc(botId).set(
            {
              movieId: imdbId,
              imdbId,
              tmdbId: tmdbId.toString(),
              characterName: character.name,
              actorName: character.actorName,
              actorId: character.actorId,
              profilePicture: character.profilePath,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
        })
      );
      console.log("Character bots saved to Firestore");
    }

    // Update channel's activeMovies
    console.log("Updating channel's activeMovies...");
    const channelRef = db.collection("channels").doc(channelId);
    await channelRef.set(
      {
        activeMovies: {
          [imdbId]: {
            imdbId,
            title: existingMovieData?.title || selectedMovie.title,
            posterPath,
            activatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
        },
      },
      { merge: true }
    );
    console.log("Channel activeMovies updated");

    // Create system message announcing the movie characters
    console.log("Creating system message...");
    const messageRef = db.collection("messages").doc();
    await messageRef.set({
      text: `Added characters from "${
        existingMovieData?.title || selectedMovie.title
      }" to the channel! You can now chat with them about the movie.`,
      sender: {
        uid: "system",
        displayName: "System",
        photoURL: null,
        email: null,
      },
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      channel: channelId,
      workspaceId: (await channelRef.get()).data().workspaceId,
      isSystem: true,
      movieData: {
        movieId: tmdbId.toString(),
        imdbId,
        title: existingMovieData?.title || selectedMovie.title,
        posterPath,
        characters: characters.map((c) => ({
          name: c.name,
          actorName: c.actorName,
          profilePath: c.profilePath,
        })),
      },
    });
    console.log("System message created");

    const result = {
      success: true,
      scriptId,
      title: existingMovieData?.title || selectedMovie.title,
      writer: selectedMovie?.writer,
      subtitle: selectedMovie?.subtitle,
      vectorCount,
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

exports.determineCharacterResponse = onDocumentCreated(
  "messages/{messageId}",
  async (event) => {
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    // Initialize LangSmith client for tracking
    const langsmith = new Client({
      apiKey: process.env.LANGSMITH_API_KEY,
      apiUrl: process.env.LANGSMITH_API_URL,
    });
    console.log("LangSmith client initialized");

    // Start LangSmith run
    const runId = uuidv4();
    await langsmith.createRun({
      id: runId,
      name: "determine_character_response",
      run_type: "chain",
      inputs: { messageId: event.params.messageId },
    });

    try {
      const snapshot = event.data;
      if (!snapshot) {
        console.log("No snapshot data found");
        await langsmith.updateRun(runId, {
          error: "No snapshot data found",
          status: "failed",
          end_time: new Date().toISOString(),
        });
        return null;
      }

      const messageData = snapshot.data();
      if (!messageData || messageData.sender.uid === "system") {
        console.log("No message data found or system message");
        await langsmith.updateRun(runId, {
          error: "No message data or system message",
          status: "failed",
          end_time: new Date().toISOString(),
        });
        return null;
      }

      // Get the channel document to check for active movies
      const channelDoc = await getFirestore()
        .collection("channels")
        .doc(messageData.channel)
        .get();

      if (!channelDoc.exists) {
        console.log(`Channel ${messageData.channel} does not exist`);
        await langsmith.updateRun(runId, {
          error: "Channel does not exist",
          status: "failed",
          end_time: new Date().toISOString(),
        });
        return null;
      }

      const channelData = channelDoc.data();
      if (
        !channelData.activeMovies ||
        Object.keys(channelData.activeMovies).length === 0
      ) {
        console.log("No active movies in channel");
        await langsmith.updateRun(runId, {
          error: "No active movies in channel",
          status: "failed",
          end_time: new Date().toISOString(),
        });
        return null;
      }

      // Check for timed out movies and remove them
      const now = admin.firestore.Timestamp.now();
      const FIVE_MINUTES = 5 * 60; // 5 minutes in seconds
      const timedOutMovies = [];
      const updatedActiveMovies = { ...channelData.activeMovies };
      let hasTimedOutMovies = false;

      for (const [imdbId, movieData] of Object.entries(
        channelData.activeMovies
      )) {
        const activatedAt = movieData.activatedAt;
        const activatedTimestamp = activatedAt.toDate
          ? activatedAt.toDate()
          : new Date(activatedAt.seconds * 1000);
        const elapsedSeconds =
          (now.toDate().getTime() - activatedTimestamp.getTime()) / 1000;

        if (elapsedSeconds > FIVE_MINUTES) {
          delete updatedActiveMovies[imdbId];
          timedOutMovies.push(movieData.title);
          hasTimedOutMovies = true;
        }
      }

      // If we found timed out movies, update the channel and send a system message
      if (hasTimedOutMovies) {
        console.log("Found timed out movies:", timedOutMovies);

        // Update channel's activeMovies
        await getFirestore()
          .collection("channels")
          .doc(messageData.channel)
          .update({
            activeMovies: updatedActiveMovies,
          });

        // Send system message about timed out movies
        const messageRef = getFirestore().collection("messages").doc();
        await messageRef.set({
          text: `Movie session${
            timedOutMovies.length > 1 ? "s" : ""
          } timed out for: ${timedOutMovies.join(", ")}`,
          sender: {
            uid: "system",
            displayName: "System",
            photoURL: null,
            email: null,
          },
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          channel: messageData.channel,
          workspaceId: channelData.workspaceId,
          isSystem: true,
        });

        // If no active movies left, return
        if (Object.keys(updatedActiveMovies).length === 0) {
          console.log("No active movies remaining after timeout check");
          await langsmith.updateRun(runId, {
            error: "No active movies remaining after timeout",
            status: "failed",
            end_time: new Date().toISOString(),
          });
          return null;
        }

        // Update channelData.activeMovies for subsequent processing
        channelData.activeMovies = updatedActiveMovies;
      }

      // Get last 10 messages from the channel for context
      const messagesSnapshot = await getFirestore()
        .collection("messages")
        .where("channel", "==", messageData.channel)
        .orderBy("timestamp", "desc")
        .limit(10)
        .get();

      const recentMessages = messagesSnapshot.docs
        .map((doc) => doc.data())
        .reverse()
        .map((msg) => ({
          text: msg.text,
          sender: msg.sender.displayName || msg.sender.email || "Unknown",
          isSystem: msg.isSystem || false,
        }));

      // Get all characters from the active movies
      const characters = [];
      const movieContexts = [];

      for (const [imdbId, movieData] of Object.entries(
        channelData.activeMovies
      )) {
        const movieDoc = await getFirestore()
          .collection("movies")
          .doc(imdbId)
          .get();

        if (!movieDoc.exists) continue;

        const movieData = movieDoc.data();
        const scriptId = movieData.scriptId;

        // Get movie context from Pinecone
        const pinecone = new Pinecone({
          apiKey: process.env.PINECONE_API_KEY,
        });
        const pineconeIndex = pinecone
          .Index(process.env.PINECONE_INDEX)
          .namespace(`movie-scripts-${imdbId}`);

        // Create embeddings for the message
        const embeddings = new OpenAIEmbeddings({
          openAIApiKey: process.env.OPENAI_API_KEY,
        });

        // Create a context string that includes recent messages and the current message
        const contextString =
          recentMessages.map((msg) => `${msg.sender}: ${msg.text}`).join("\n") +
          `\n${
            messageData.sender.displayName ||
            messageData.sender.email ||
            "Unknown"
          }: ${messageData.text}`;

        const queryEmbedding = await embeddings.embedQuery(contextString);

        // Query Pinecone for relevant context
        const queryResponse = await pineconeIndex.query({
          vector: queryEmbedding,
          topK: 3,
          includeMetadata: true,
        });

        if (queryResponse.matches.length > 0) {
          movieContexts.push({
            movieTitle: movieData.title,
            context: queryResponse.matches
              .map((match) => match.metadata.text)
              .join("\n"),
          });
        }

        const botsSnapshot = await getFirestore()
          .collection("bots")
          .where("movieId", "==", imdbId)
          .get();

        botsSnapshot.forEach((doc) => {
          const botData = doc.data();
          characters.push({
            id: doc.id,
            name: botData.characterName,
            movieTitle: movieDoc.data().title,
            movieId: imdbId,
            profilePicture: botData.profilePicture,
          });
        });
      }

      if (characters.length === 0) {
        console.log("No characters found");
        await langsmith.updateRun(runId, {
          error: "No characters found",
          status: "failed",
          end_time: new Date().toISOString(),
        });
        return null;
      }

      // Initialize ChatOpenAI from LangChain
      const model = new ChatOpenAI({
        modelName: "gpt-4",
        temperature: 0.7,
        openAIApiKey: process.env.OPENAI_API_KEY,
      });

      // Create character selection prompt template
      const characterSelectionPrompt = ChatPromptTemplate.fromMessages([
        HumanMessagePromptTemplate.fromTemplate(`Given the following message in a chat: "{message}"

And these movie characters who could potentially respond:
{characterList}

Recent chat context:
{chatHistory}

Determine which character would be most appropriate to respond to this message, if any. Consider:
1. The message content and context
2. The character's personality and role in their movie
3. Whether the message warrants any response at all

given the above movie and message, give each character in this list a score between 0 and 1 of the probability that they 
should respond to the message. their names should be exactly as they are in the list before the colon. reply in proper json format and nothing 
else. Keep in mind that conversations should be short.  If more characters go back and forth, the less likely they are to respond.
Don't keep the conversation to just one or two characters unless strictly necessary; try to keep everyone involved. 
Characters from different movies are curious about each other.`),
      ]);

      // Create character selection chain
      const characterSelectionChain = characterSelectionPrompt
        .pipe(model)
        .pipe(new StringOutputParser());

      // Execute character selection chain
      const characterProbabilities = await characterSelectionChain.invoke({
        message: messageData.text,
        characterList: characters
          .map((c) => `${c.name}: from "${c.movieTitle}"`)
          .join("\n"),
        chatHistory: recentMessages
          .map((msg) => `${msg.sender}: ${msg.text}`)
          .join("\n"),
      });

      console.log("Character probabilities:", characterProbabilities);

      // Parse the JSON response
      let probabilities;
      try {
        probabilities = JSON.parse(characterProbabilities);
      } catch (error) {
        console.error("Error parsing character probabilities:", error);
        await langsmith.updateRun(runId, {
          error: "Invalid probability JSON format",
          status: "failed",
          end_time: new Date().toISOString(),
        });
        return null;
      }

      // Find the character with the highest probability
      let highestProb = 0;
      let characterToRespond = null;

      for (const [name, probability] of Object.entries(probabilities)) {
        if (probability > highestProb) {
          highestProb = probability;
          characterToRespond = name;
        }
      }

      console.log(
        "Highest probability character:",
        characterToRespond,
        "with probability:",
        highestProb
      );

      // If no character has a probability above 0.8, return
      if (highestProb < 0.8 || !characterToRespond) {
        console.log("No character had high enough probability to respond");
        await langsmith.updateRun(runId, {
          outputs: { probabilities, highestProb, characterToRespond: null },
          status: "completed",
          end_time: new Date().toISOString(),
        });
        return null;
      }

      // Find the selected character's data
      const selectedCharacter = characters.find(
        (c) => c.name.toLowerCase() === characterToRespond.toLowerCase()
      );
      if (!selectedCharacter) {
        console.log("Selected character not found in available characters");
        await langsmith.updateRun(runId, {
          error: "Selected character not found",
          status: "failed",
          end_time: new Date().toISOString(),
        });
        return null;
      }

      // Get relevant movie context
      const relevantContext = movieContexts.find(
        (c) => c.movieTitle === selectedCharacter.movieTitle
      );

      // Create response generation prompt template
      const responsePrompt = ChatPromptTemplate.fromMessages([
        HumanMessagePromptTemplate.fromTemplate(`You are {character} from "{movie}". 
      
Recent chat context:
{chatHistory}

Movie context:
{movieContext}

Respond to the message: "{message}"

Write a response that:
1. Matches your character's personality, speech patterns, and knowledge
2. References the movie context when relevant
3. Is concise (1-3 sentences)
4. Don't be overly kind or friendly. Match the tone of the movie and character.

Output ONLY your response message, no other text or explanation.
Characters from different movies are initially curious about each other and will respond to each other.
`),
      ]);

      // Create response generation chain
      const responseChain = responsePrompt
        .pipe(model.bind({ temperature: 0.9 }))
        .pipe(new StringOutputParser());

      // Execute response generation chain
      const botResponse = await responseChain.invoke({
        character: characterToRespond,
        movie: selectedCharacter.movieTitle,
        chatHistory: recentMessages
          .map((msg) => `${msg.sender}: ${msg.text}`)
          .join("\n"),
        movieContext: relevantContext
          ? `Relevant context from your movie:\n${relevantContext.context}`
          : "",
        message: messageData.text,
      });

      console.log("Bot response:", botResponse);

      // Add the bot's response to Firestore
      const botMessageRef = getFirestore().collection("messages").doc();
      await botMessageRef.set({
        text: botResponse,
        sender: {
          uid: selectedCharacter.id,
          displayName: selectedCharacter.name,
          photoURL: selectedCharacter.profilePicture || null,
          email: null,
        },
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        channel: messageData.channel,
        workspaceId: channelData.workspaceId,
        isBot: true,
      });

      // End LangSmith run with success
      await langsmith.updateRun(runId, {
        outputs: {
          characterToRespond,
          botResponse,
          movieContext: relevantContext?.context || null,
        },
        status: "completed",
        end_time: new Date().toISOString(),
      });

      return {
        success: true,
        character: characterToRespond,
        response: botResponse,
      };
    } catch (error) {
      console.error("Error in determineCharacterResponse:", error);

      // End LangSmith run with error
      await langsmith.updateRun(runId, {
        error: error.message,
        status: "failed",
        end_time: new Date().toISOString(),
      });

      return null;
    }
  }
);
