import * as net from 'net';

/**
 * Simple TCP port checker that tests if MongoDB port is open
 * This runs before the actual app bootstrap to detect basic connectivity issues
 */
export async function checkMongoDBConnectivity(): Promise<boolean> {
  // Get MongoDB URI from environment variables
  const MONGO_URI = process.env['MONGO_URI'];
  
  if (!MONGO_URI) {
    console.log('No MONGO_URI environment variable set, skipping connectivity check');
    return false;
  }
  
  try {
    // Parse MongoDB URI to get host and port
    const url = new URL(MONGO_URI);
    const host = url.hostname;
    const port = parseInt(url.port, 10) || 27017; // Default MongoDB port is 27017
    
    console.log(`Testing MongoDB connectivity at ${host}:${port}...`);
    
    // Promise-based TCP connection test
    return new Promise<boolean>((resolve) => {
      const socket = new net.Socket();
      let resolved = false;
      
      const finalizeCheck = (success: boolean) => {
        if (!resolved) {
          resolved = true;
          if (success) {
            console.log(`MongoDB connection test: SUCCESSFUL`);
          } else {
            console.log(`MongoDB connection test: FAILED`);
          }
          resolve(success);
        }
      };
      
      socket.setTimeout(3000); // 3 second timeout
      
      socket.on('connect', () => {
        socket.end();
        finalizeCheck(true);
      });
      
      socket.on('timeout', () => {
        socket.destroy();
        finalizeCheck(false);
      });
      
      socket.on('error', (err) => {
        // Use warning message instead of error for connection issues
        console.warn(`Connection warning: ${err.message}`);
        finalizeCheck(false);
      });
      
      // Attempt to connect
      socket.connect(port, host);
    });
  } catch (err) {
    console.error('Error parsing MongoDB URI:', err);
    return false;
  }
} 