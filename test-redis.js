const { createClient } = require('redis');

async function testRedisConnection() {
  const redisUrl = process.env.NEXT_PUBLIC_REDIS_URL || process.env.REDIS_URL;
  
  console.log('Testing Redis connection...');
  console.log('Redis URL:', redisUrl.replace(/:[^:@]*@/, ':****@')); // Hide password in logs
  
  const client = createClient({
    url: redisUrl,
    socket: {
      connectTimeout: 10000,
      commandTimeout: 5000,
    },
  });

  client.on('error', (err) => {
    console.error('Redis Client Error:', err.message);
  });

  client.on('connect', () => {
    console.log('✅ Redis Client Connected Successfully');
  });

  client.on('ready', () => {
    console.log('✅ Redis Client Ready');
  });

  try {
    console.log('Attempting to connect...');
    await client.connect();
    
    console.log('Testing basic operations...');
    
    // Test SET operation
    await client.set('test:connection', 'success');
    console.log('✅ SET operation successful');
    
    // Test GET operation
    const value = await client.get('test:connection');
    console.log('✅ GET operation successful, value:', value);
    
    // Test sorted set operations (used in our app)
    await client.zAdd('test:sorted', { score: Date.now(), value: 'test-item' });
    console.log('✅ ZADD operation successful');
    
    const sortedItems = await client.zRevRange('test:sorted', 0, 0);
    console.log('✅ ZREVRANGE operation successful, items:', sortedItems);
    
    // Clean up test data
    await client.del('test:connection');
    await client.del('test:sorted');
    console.log('✅ Cleanup successful');
    
    console.log('🎉 All Redis operations working correctly!');
    
  } catch (error) {
    console.error('❌ Redis connection failed:', error.message);
    console.error('Error details:', error);
  } finally {
    try {
      await client.quit();
      console.log('Connection closed');
    } catch (err) {
      console.error('Error closing connection:', err.message);
    }
  }
}

testRedisConnection(); 