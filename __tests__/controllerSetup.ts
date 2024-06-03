import { MongoMemoryReplSet, MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

let mongoServer: MongoMemoryReplSet;
// let mongoServer: MongoMemoryServer;
process.env.JWT_SECRET = "someSecret";
beforeAll(async () => {
  mongoServer = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
  });
  // mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
});

// afterEach(async () => {
//   const collections = mongoose.connection.collections;
//   for (const key in collections) {
//     const collection = collections[key];
//     await collection.deleteMany();
//   }
// });

// beforeAll((done) => {
//   server = app.listen(3000, done);
// });

// afterAll((done) => {
//   server.close(done);
// });
