// Ping Service - Independent ping testing service
class PingService {
  constructor() {
    this.pingResults = new Map();
    this.isPinging = new Set();
  }

  // Perform ping test for a host
  async pingHost(host) {
    if (this.isPinging.has(host)) {
      console.log(`Ping already in progress for ${host}`);
      return this.pingResults.get(host) || { success: false, time: 'N/A', error: 'Ping in progress' };
    }

    this.isPinging.add(host);
    console.log(`Starting ping test for: ${host}`);

    try {
      const response = await fetch('/api/ping', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify({ host })
      });
      
      console.log(`Ping response status for ${host}:`, response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log(`Ping result for ${host}:`, result);
        
        // Store result
        this.pingResults.set(host, result);
        return result;
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error(`Ping failed for ${host}:`, errorData);
        
        const errorResult = { 
          success: false, 
          time: 'N/A', 
          error: errorData.message || 'Ping failed' 
        };
        this.pingResults.set(host, errorResult);
        return errorResult;
      }
    } catch (error) {
      console.error(`Ping network error for ${host}:`, error);
      
      const errorResult = { 
        success: false, 
        time: 'N/A', 
        error: 'Network error: ' + error.message 
      };
      this.pingResults.set(host, errorResult);
      return errorResult;
    } finally {
      this.isPinging.delete(host);
    }
  }

  // Get cached ping result
  getCachedResult(host) {
    return this.pingResults.get(host);
  }

  // Clear cached results
  clearCache() {
    this.pingResults.clear();
    this.isPinging.clear();
  }

  // Get all cached results
  getAllResults() {
    return Object.fromEntries(this.pingResults);
  }

  // Check if ping is in progress
  isPingInProgress(host) {
    return this.isPinging.has(host);
  }
}

// Create singleton instance
const pingService = new PingService();

export default pingService;
