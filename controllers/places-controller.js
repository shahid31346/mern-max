const HttpError = require("../models/http-error");
const { v4: uuidv4 } = require("uuid");
const { validationResult } = require("express-validator");
const PlaceModel = require("../models/place");
const User = require("../models/user");
const mongoose = require("mongoose");
var fs = require("fs");

let DUMMY_PLACES = [
  {
    id: "p1",
    title: "Empire State Building",
    description: "One of the most famous sky scrapers in the world!",
    location: {
      lat: 40.7484474,
      lng: -73.9871516,
    },
    address: "20 W 34th St, New York, NY 10001",
    creator: "u1",
  },
];

///
const getPlaceById = async (req, res, next) => {
  const placeId = req.params.pid; // { pid: 'p1' }
  let place;
  try {
    place = await PlaceModel.findById(placeId);
  } catch (error) {
    const errors = new HttpError(
      "Something went wrong, could not find a place",
      404
    );
    return next(errors);
  }
  // const place = DUMMY_PLACES.find((p) => {
  //   return p.id === placeId;
  // });

  if (!place) {
    const errors = HttpError(
      "Could not find a place for the provided id.",
      404
    );
    return next(errors);
  }

  console.log(place);

  res.json({ place: place.toObject({ getters: true }) }); // => { place } => { place: place }
};

const getPlacesByUserId = async (req, res, next) => {
  const userId = req.params.uid;

  let places;
  try {
    places = await PlaceModel.find({ creator: userId });
  } catch (error) {
    const errors = new HttpError(
      "Something went wrong, could not find a place with this user",
      404
    );
    return next(errors);
  }

  // const places = DUMMY_PLACES.filter((p) => {
  //   return p.creator === userId;
  // });

  if (!places || places.length === 0) {
    return next(
      new HttpError("Could not find any places for the provided user id.", 404)
    );
  }

  res.json({
    places: places.map((p) => p.toObject({ getters: true })),
  });
};

////
const createPlace = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return next(
      new HttpError("Invalid input passed, please check your data", 422)
    );
  }

  const { title, description, address, lat, lng, creator } = req.body;

  const createdPlace = PlaceModel({
    title,
    description,
    image: req.file.path.replace(/\\/g, "/"),
    address,
    location: {
      lat: lat,
      lng: lng,
    },
    creator,
  });

  let user;

  try {
    user = await User.findById(creator);
    // console.log(user);
  } catch (error) {
    return next(
      new HttpError("Creating place failed, please try again later", 404)
    );
  }

  if (!user) {
    return next(new HttpError("Coud not find user for provided id", 404));
  }

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await createdPlace.save({ session: sess });
    user.places.push(createdPlace);
    await user.save({ session: sess });
    await sess.commitTransaction();
  } catch (error) {
    return next(new HttpError(error, 500));
  }
  res.status(201).json({ place: createdPlace });
};

//////
const updatePlace = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return next(
      new HttpError("Invalid input passed, please check your data", 422)
    );
  }

  const { title, description } = req.body;
  const placeId = req.params.pid;

  let place;
  try {
    place = await PlaceModel.findById(placeId);
  } catch (error) {
    const errors = new HttpError(
      "Something went wrong, could not find update the place",
      404
    );
    return next(errors);
  }

  // const updatedPlace = { ...DUMMY_PLACES.find((p) => p.id === placeId) };
  // const placeIndex = DUMMY_PLACES.findIndex((p) => p.id === placeId);
  place.title = title;
  place.description = description;

  try {
    await place.save();
  } catch (error) {
    const errors = new HttpError(
      "Something went wrong, could not update the place",
      404
    );
    return next(errors);
  }

  // DUMMY_PLACES[placeIndex] = updatedPlace;
  res.status(200).json({ place: place.toObject({ getters: true }) });
};

const deletePlace = async (req, res, next) => {
  const placeId = req.params.pid;

  let place;
  try {
    place = await PlaceModel.findById(placeId).populate("creator");
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not delete place.",
      500
    );
    return next(error);
  }

  if (!place) {
    const error = new HttpError("Could not find place for this id", 500);
    return next(error);
  }

  const imagePath = place.image;

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await place.remove({ session: sess });
    place.creator.places.pull(place);
    await place.creator.save({ sessions: sess });
    await sess.commitTransaction();
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not delete place.",
      500
    );
    return next(error);
  }
  fs.unlink(imagePath, (r) => {
    console.log(r);
  });

  res.status(200).json({ message: "Deleted place." });
};

// const deletePlace = (req, res, next) => {
//   const placeId = req.params.pid;
//   if (!DUMMY_PLACES.find((p) => p.is === placeId)) {
//     throw new HttpError("Could not find a place for that id.", 404);
//   }

//   DUMMY_PLACES = DUMMY_PLACES.filter((p) => {
//     p.id !== placeId;
//   });

//   res.status(200).json({ message: "Place deleted successfully" });
// };

exports.getPlaceById = getPlaceById;
exports.getPlacesByUserId = getPlacesByUserId;
exports.createPlace = createPlace;
exports.updatePlace = updatePlace;
exports.deletePlace = deletePlace;
