import async from 'async';
import * as mongoose from 'mongoose';
const mongoURI =
  'mongodb+srv://admin:p9xXsX2c2k2zjSj4@cluster0.pvkro.mongodb.net/Carcasonne_angular?retryWrites=true&w=majority';
const tiles = [];
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });
const database = mongoose.connection;
database.on('error', console.error.bind(console, 'MongoDB connection error:'));

const tilesCreate = (
  rotation,
  tileType,
  tilesValues,
  extraPoints,
  followerPlacement,
  isFollowerPlaced,
) => {};
