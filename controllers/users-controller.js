const { validationResult } = require("express-validator");
const { v4: uuidv4 } = require("uuid");
const HttpError = require("../models/http-error");
const User = require("../models/user");

const DUMMY_USERS = [
  {
    id: "u1",
    name: "Max Schwarz",
    email: "test@test.com",
    password: "testers",
  },
];

const getUsers = async (req, res, next) => {
  let users;
  try {
    users = await User.find({}, "-password");
  } catch (error) {
    const err = new HttpError(
      "Fetching users failed, Please try agian later",
      500
    );
    return next(err);
  }

  res
    .status(200)
    .json({ users: users.map((user) => user.toObject({ getters: true })) });
};

const login = async (req, res, next) => {
  const { email, password } = req.body;
  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (error) {
    const err = new HttpError("Sign Up failed, Please try agian later", 500);
    return next(err);
  }

  //const identifiedUser = DUMMY_USERS.find((u) => u.email === email);
  if (!existingUser || existingUser.password !== password) {
    const err = new HttpError(
      "Could not identify user, credentials seem to be wrong.",
      401
    );
    return next(err);
  }

  res.json({ message: "Logged in!" });
};

const signupUsers = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return next(
      new HttpError("Invalid input passed, please check your data", 422)
    );
  }
  const { name, email, password } = req.body;

  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (error) {
    const err = new HttpError("Sign Up failed, Please try agian later", 500);
    return next(err);
  }
  console.log(existingUser);
  if (existingUser) {
    const error = new HttpError(
      "User exists already, please Login instead.",
      422
    );
    return next(error);
  }

  //const hasUser = DUMMY_USERS.find((u) => u.email === email);

  // if (hasUser) {
  //   throw new HttpError("user already exist", 422);
  // }

  // const createdUser = {
  //   id: uuidv4(),
  //   name,
  //   email,
  //   password,
  // };
  const createdUser = new User({
    name,
    email,
    image: req.file.path.replace(/\\/g, '/'),
    password,
    places: [],
  });
  try {
    await createdUser.save();
  } catch (error) {
    const errors = new HttpError(
      "Something went wrong, could not add user",
      404
    );
    return next(errors);
  }

  // DUMMY_PLACES[placeIndex] = updatedPlace;
  res.status(200).json({ user: createdUser.toObject({ getters: true }) });

  // DUMMY_USERS.push(createdUser);

  // res.status(200).json({ user: createdUser });
};

exports.getUsers = getUsers;
exports.login = login;
exports.signupUsers = signupUsers;
