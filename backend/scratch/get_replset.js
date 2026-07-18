const { MongoClient } = require('mongodb');

const uri = 'mongodb://dashwanth:Dashwanth%40127@ac-j9i00sk-shard-00-00.modyxw1.mongodb.net:27017/stacksave?ssl=true&authSource=admin';

async function main() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log('Connected successfully!');
    const db = client.db('stacksave');
    const status = await db.command({ hello: 1 });
    console.log('Replica Set Name:', status.setName);
  } catch (err) {
    console.error('Error connecting:', err);
  } finally {
    await client.close();
  }
}

main();
