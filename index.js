const { OpenAI } = require("openai");
const express = require("express");
require("dotenv").config();
const cors = require("cors");
const app = express();

//Use cors
const allowOrigins = [
  "http://localhost:3000",
  "https://tuvanluat.boxai.tech" /** other domains if any */,
];

const corsOptions = {
  credentials: true,
  origin: true,
  // origin: (origin, callback) => {
  //   if (allowOrigins.indexOf(origin) !== -1) {
  //     callback(null, true);
  //   } else {
  //     callback(new Error("Not allowed by CORS"));
  //   }
  // },
};
app.use(cors(corsOptions));

app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.API_KEY,
});

let threadId = "";

app.post("/chat", async (req, res) => {
  const assistantIdToUse = "asst_nNQHWG2HBf7066G5w4kOhZ0k"; // Replace with your assistant ID
  const modelToUse = "gpt-4-1106-preview"; // Specify the model you want to use

  // Create a new thread if first message
  if (!threadId) {
    try {
      const myThread = await openai.beta.threads.create();
      console.log("New thread created with ID: ", myThread.id, "\n");
      threadId = myThread.id; // Store the thread ID for this user
    } catch (error) {
      console.error("Error creating thread:", error);
      res.status(500).json({ error: "Internal server error" });
      return;
    }
  }

  try {
    const { question } = req.body;

    // Add question to thread
    const myThreadMessage = await openai.beta.threads.messages.create(
      threadId, // Use the stored thread ID for this user
      {
        role: "user",
        content: question,
      }
    );
    console.log("This is the message object: ", myThreadMessage, "\n");

    // Assistant read the thread and answer
    // Run the Assistant
    const myRun = await openai.beta.threads.runs.create(
      threadId, // Use the stored thread ID for this user
      {
        assistant_id: assistantIdToUse,
      }
    );
    console.log("This is the run object: ", myRun, "\n");

    // Periodically retrieve the Run to check on its status
    const retrieveRun = async () => {
      let keepRetrievingRun;

      while (myRun.status !== "completed") {
        keepRetrievingRun = await openai.beta.threads.runs.retrieve(
          threadId, // Use the stored thread ID for this user
          myRun.id
        );

        //console.log(`Run status: ${keepRetrievingRun.status}`);

        if (keepRetrievingRun.status === "completed") {
          console.log("\n");
          break;
        }
      }
    };
    retrieveRun();

    // Retrieve the Messages added by the Assistant to the Thread
    const waitForAssistantMessage = async () => {
      await retrieveRun();

      const allMessages = await openai.beta.threads.messages.list(
        threadId // Use the stored thread ID for this user
      );

      // Send the response back to the front end
      res.status(200).json({
        answer: allMessages.data[0].content[0].text.value,
      });
      console.log(
        "------------------------------------------------------------ \n"
      );

      console.log("User: ", myThreadMessage.content[0].text.value);
      console.log("Assistant: ", allMessages.data[0].content[0].text.value);
    };
    waitForAssistantMessage();
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(5000, () => {
  console.log("Server is active");
});
