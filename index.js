const express = require("express");
const bodyParser = require("body-parser");
const placesRoutes = require("./routes/places-routes");
const userRoutes = require("./routes/user-routes");
var fs = require("fs");
const path = require("path");

const HttpError = require("./models/http-error");
const mongoose = require("mongoose");

const app = express();
app.use(bodyParser.json());
app.use("/uploads/images", express.static(path.join("uploads", "images")));

app.use("/api/places", placesRoutes); // => /api/places...
app.use("/api/users", userRoutes); // => /api/users...

app.use((req, res, next) => {
  const error = new HttpError("This route does not exist", 404);
  throw error;
});
app.use((error, req, res, next) => {
  if (req.file) {
    fs.unlink(req.file.path, (err) => {
      console.log(err);
    });
  }
  if (res.headerSent) {
    return next(error);
  }
  res.status(error.code || 500);
  res.json({
    status: "error",
    message: error.message || "An unknown error occurred!",
  });
});

mongoose
  .connect(
    `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.rnbz6sq.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`
  )
  .then(() => {
    app.listen(5000);
    console.log("Server runing on port 5000");
  })
  .catch((err) => {
    console.log(err);
  });
