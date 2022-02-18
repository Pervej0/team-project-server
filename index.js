const express = require("express");
const app = express();
const { MongoClient } = require("mongodb");
require("dotenv").config();
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const port = process.env.PORT || 4000;

const ObjectId = require("mongodb").ObjectId;

// middleware
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.sjbgh.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const run = async () => {
  const database = client.db("blood_donation");
  const bloodReq_postCollection = database.collection("bloodReq_post");
  const chatCollection = database.collection("chit_chat");
  const reviewCollection = database.collection("review");

  try {
    await client.connect();

    app.post("/post", async (req, res) => {
      const data = req.body;
      const result = await bloodReq_postCollection.insertOne(data);
      res.json(result);
    });

    app.get("/post", async (req, res) => {
      const cursor = bloodReq_postCollection.find({}).sort({ _id: -1 });
      const page = req.query.page;
      const size = parseInt(req.query.size);
      let post;
      const count = await cursor.count();
      if (page) {
        post = await cursor
          .skip(page * size)
          .limit(size)
          .toArray();
      } else {
        post = await cursor.toArray();
      }
      res.json({
        post,
        count,
      });
    });

    // chats inserting
    app.post("/chat", async (req, res) => {
      const data = req.body;

      const query = await chatCollection.insertOne(data);
    });

    // getting specific message by email
    app.get("/chat/:email", async (req, res) => {
      const email = req.params.email;
      const query = { room: email };
      const messages = await chatCollection.find(query).toArray();
      res.json(messages);
    });

        //POST API FOR Review
        app.post("/review", async (req, res) => {
          const place = req.body;
          const result = await reviewCollection.insertOne(place);
          res.json(result);
          // console.log(`A document was inserted with the _id: ${result.insertedId}`);
        });
            //GET API for Review
    app.get("/review", async (req, res) => {
      const cursor = reviewCollection.find({});
      const result = await cursor.toArray();
      res.json(result);
    });


    //DELETE API USING OBJECT ID
    app.delete("/post/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await bloodReq_postCollection.deleteOne(query);
      res.json(result);
    });
    //GET API
    app.get("/post/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await bloodReq_postCollection.findOne(query);
      res.json(result);
    });
    // //UPDATE PUT API
    app.put("/post/:id", async (req, res) => {
      const id = req.params.id;
      const updateStatus = req.body.status;
      // console.log('hitting with req.body', req.body);
      const filter = { _id: ObjectId(req.body._id) };
      // console.log('hitting with status', filter);
      const options = { upsert: true };
      const updateDoc = {
        $set: { status: updateStatus },
      };
      const result = await bloodReq_postCollection.updateOne(filter, updateDoc, options);
      res.send(result);
    });
  } finally {
    // await client.close();
  }
};
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Welocome to server");
});

// socket io for chat
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("User", socket.id);

  socket.on("join_room", (data) => {
    socket.join(data);
  });

  socket.on("send_message", (data) => {
    socket.to(data.room).emit("received_message", data);
  });

  socket.on("disconnect", () => {
    console.log("Disconnected", socket.id);
  });
});

// server listening
server.listen(port, () => {
  console.log("Server is running on ", port);
});
