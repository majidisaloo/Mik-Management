import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const QueueLogs = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('queue');
  const [queue, setQueue] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadQueueAndLogs = async () => {
    try {
      setLoading(true);
      const [queueRes, logsRes] = await Promise.all([
        fetch(`/api/ipams/${id}/queue`),
        fetch(`/api/ipams/${id}/logs`)
      ]);
      
      if (queueRes.ok) {
        const queueData = await queueRes.json();
        setQueue(queueData);
      }
      
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setLogs(logsData);
      }
    } catch (err) {
      setError('Failed to load queue and logs');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && id) {
      loadQueueAndLogs();
    }
  }, [user, id]);

  const handleRetry = async (queueId) => {
    try {
      const res = await fetch(`/api/ipams/${id}/queue/${queueId}/retry`, {
        method: 'POST'
      });
      
      if (res.ok) {
        alert('Operation queued for retry');
        loadQueueAndLogs();
      }
    } catch (err) {
      console.error('Retry failed:', err);
      alert('Retry failed');
    }
  };

  const handleDeleteQueue = async (queueId) => {
    if (!confirm('Delete this queue item?')) return;
    
    try {
      const res = await fetch(`/api/ipams/${id}/queue/${queueId}`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        alert('Queue item deleted');
        loadQueueAndLogs();
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleDeleteLog = async (logId) => {
    if (!confirm('Delete this log entry?')) return;
    
    try {
      const res = await fetch(`/api/ipams/${id}/logs/${logId}`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        alert('Log entry deleted');
        loadQueueAndLogs();
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      pending: '#ffc107',
      processing: '#17a2b8',
      completed: '#28a745',
      failed: '#dc3545',
      success: '#28a745'
    };
    
    return (
      <span style={{
        padding: '4px 12px',
        borderRadius: '12px',
        backgroundColor: colors[status] || '#6c757d',
        color: 'white',
        fontSize: '12px',
        fontWeight: '600',
        textTransform: 'uppercase'
      }}>
        {status}
      </span>
    );
  };

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ marginBottom: '20px', fontSize: '24px', fontWeight: '600' }}>
        Queue & Logs
      </h2>

      {/* Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '10px', 
        marginBottom: '20px',
        borderBottom: '2px solid #e0e0e0'
      }}>
        <button
          onClick={() => setActiveTab('queue')}
          style={{
            padding: '12px 24px',
            border: 'none',
            borderBottom: activeTab === 'queue' ? '3px solid #007bff' : 'none',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: activeTab === 'queue' ? '600' : '400',
            color: activeTab === 'queue' ? '#007bff' : '#666'
          }}
        >
          Queue ({queue.length})
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          style={{
            padding: '12px 24px',
            border: 'none',
            borderBottom: activeTab === 'logs' ? '3px solid #007bff' : 'none',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: activeTab === 'logs' ? '600' : '400',
            color: activeTab === 'logs' ? '#007bff' : '#666'
          }}
        >
          Logs ({logs.length})
        </button>
      </div>

      {/* Queue Tab */}
      {activeTab === 'queue' && (
        <div>
          {queue.length === 0 ? (
            <div style={{ 
              padding: '40px', 
              textAlign: 'center', 
              color: '#999',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px'
            }}>
              No items in queue
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {queue.map(item => (
                <div key={item.id} style={{
                  padding: '16px',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  backgroundColor: '#fff'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '12px',
                        marginBottom: '8px'
                      }}>
                        <span style={{ 
                          fontSize: '16px', 
                          fontWeight: '600',
                          textTransform: 'uppercase'
                        }}>
                          {item.type.replace(/_/g, ' ')}
                        </span>
                        {getStatusBadge(item.status)}
                      </div>
                      
                      <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>
                        <strong>Created:</strong> {new Date(item.createdAt).toLocaleString()}
                      </div>
                      
                      {item.retryCount > 0 && (
                        <div style={{ fontSize: '14px', color: '#ff9800' }}>
                          <strong>Retry Count:</strong> {item.retryCount}
                        </div>
                      )}
                      
                      {item.error && (
                        <div style={{ 
                          fontSize: '13px', 
                          color: '#dc3545',
                          marginTop: '8px',
                          padding: '8px',
                          backgroundColor: '#ffe6e6',
                          borderRadius: '4px'
                        }}>
                          <strong>Error:</strong> {item.error}
                        </div>
                      )}
                      
                      <details style={{ marginTop: '8px' }}>
                        <summary style={{ cursor: 'pointer', color: '#007bff', fontSize: '13px' }}>
                          View Data
                        </summary>
                        <pre style={{ 
                          marginTop: '8px',
                          padding: '8px',
                          backgroundColor: '#f8f9fa',
                          borderRadius: '4px',
                          fontSize: '12px',
                          overflow: 'auto'
                        }}>
                          {JSON.stringify(item.data, null, 2)}
                        </pre>
                      </details>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {(item.status === 'failed' || item.status === 'pending') && (
                        <button
                          onClick={() => handleRetry(item.id)}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: '#ffc107',
                            color: '#000',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '500'
                          }}
                        >
                          🔄 Retry
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteQueue(item.id)}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '500'
                        }}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Logs Tab */}
      {activeTab === 'logs' && (
        <div>
          {logs.length === 0 ? (
            <div style={{ 
              padding: '40px', 
              textAlign: 'center', 
              color: '#999',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px'
            }}>
              No logs available
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {logs.map(item => (
                <div key={item.id} style={{
                  padding: '16px',
                  border: `1px solid ${item.status === 'success' ? '#28a745' : '#dc3545'}`,
                  borderRadius: '8px',
                  backgroundColor: item.status === 'success' ? '#f0fff4' : '#fff5f5'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '12px',
                        marginBottom: '8px'
                      }}>
                        <span style={{ 
                          fontSize: '16px', 
                          fontWeight: '600',
                          textTransform: 'uppercase'
                        }}>
                          {item.type.replace(/_/g, ' ')}
                        </span>
                        {getStatusBadge(item.status)}
                      </div>
                      
                      <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>
                        <strong>Completed:</strong> {new Date(item.completedAt).toLocaleString()}
                      </div>
                      
                      {item.retryCount > 0 && (
                        <div style={{ fontSize: '14px', color: '#ff9800', marginBottom: '4px' }}>
                          <strong>Retries:</strong> {item.retryCount}
                        </div>
                      )}
                      
                      {/* Verification Result */}
                      <div style={{ 
                        marginTop: '12px',
                        padding: '12px',
                        backgroundColor: item.status === 'success' ? '#e8f5e9' : '#ffebee',
                        borderRadius: '6px',
                        border: `1px solid ${item.status === 'success' ? '#4caf50' : '#f44336'}`
                      }}>
                        <div style={{ 
                          fontSize: '14px', 
                          fontWeight: '600',
                          marginBottom: '8px',
                          color: item.status === 'success' ? '#2e7d32' : '#c62828'
                        }}>
                          {item.status === 'success' ? '✅ Verification Passed' : '❌ Verification Failed'}
                        </div>
                        <div style={{ fontSize: '13px', color: '#666' }}>
                          {item.verificationDetails?.message}
                        </div>
                        
                        <details style={{ marginTop: '8px' }}>
                          <summary style={{ cursor: 'pointer', color: '#007bff', fontSize: '13px' }}>
                            View Verification Details
                          </summary>
                          <pre style={{ 
                            marginTop: '8px',
                            padding: '8px',
                            backgroundColor: 'white',
                            borderRadius: '4px',
                            fontSize: '12px',
                            overflow: 'auto'
                          }}>
                            {JSON.stringify(item.verificationDetails, null, 2)}
                          </pre>
                        </details>
                      </div>
                      
                      <details style={{ marginTop: '8px' }}>
                        <summary style={{ cursor: 'pointer', color: '#007bff', fontSize: '13px' }}>
                          View Operation Data
                        </summary>
                        <pre style={{ 
                          marginTop: '8px',
                          padding: '8px',
                          backgroundColor: 'white',
                          borderRadius: '4px',
                          fontSize: '12px',
                          overflow: 'auto'
                        }}>
                          {JSON.stringify(item.data, null, 2)}
                        </pre>
                      </details>
                    </div>
                    
                    <div>
                      <button
                        onClick={() => handleDeleteLog(item.id)}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#6c757d',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '500'
                        }}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Refresh Button */}
      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <button
          onClick={loadQueueAndLogs}
          style={{
            padding: '12px 24px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          🔄 Refresh
        </button>
      </div>
    </div>
  );
};

export default QueueLogs;

