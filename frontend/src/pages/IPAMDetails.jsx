import { useCallback, useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import './IPAMDetails.css';

// Isolated styles for IPAM Details page
const ipamStyles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '24px'
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    margin: '8px 0 4px'
  },
  subtitle: {
    fontSize: '14px',
    color: '#666'
  },
  statusCard: {
    backgroundColor: '#fff',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '24px'
  },
  statusContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  statusDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%'
  },
  tabNav: {
    display: 'flex',
    gap: '8px',
    borderBottom: '1px solid #e0e0e0',
    marginBottom: '24px'
  },
  tabButton: {
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '500',
    border: 'none',
    borderBottom: '2px solid transparent',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    transition: 'all 0.2s',
    color: '#333' // Light mode default
  },
  tabButtonActive: {
    color: '#007bff',
    borderBottomColor: '#007bff'
  },
  statCard: {
    backgroundColor: '#fff',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    padding: '20px',
    textAlign: 'center',
    height: '128px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center'
  },
  statIcon: {
    width: '48px',
    height: '48px',
    backgroundColor: 'rgba(0, 123, 255, 0.1)',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 12px'
  },
  statNumber: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#007bff',
    marginBottom: '4px'
  },
  statLabel: {
    fontSize: '14px',
    color: '#666'
  }
};

// Icons
const BackIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const NetworkIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
    <path d="M8 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 8v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const BuildingIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const DatabaseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="12" cy="5" rx="9" ry="3" stroke="currentColor" strokeWidth="2" />
    <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" stroke="currentColor" strokeWidth="2" />
    <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" stroke="currentColor" strokeWidth="2" />
  </svg>
);

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const MinusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const FolderIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const RefreshIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ChevronLeftIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IPAMDetails = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id, sectionId, rangeId } = useParams();
  const [ipam, setIpam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedSections, setExpandedSections] = useState(new Set());
  const [expandedDatacenters, setExpandedDatacenters] = useState(new Set());
  const [expandedRanges, setExpandedRanges] = useState(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedSection, setSelectedSection] = useState(null);
  const submenuScrollRef = useRef(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const [sections, setSections] = useState([]);
  const [sectionRanges, setSectionRanges] = useState({});
  const [expandedRangeItems, setExpandedRangeItems] = useState(new Set());
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [selectedRangeForSplit, setSelectedRangeForSplit] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Queue & Logs states
  const [queueLogsTab, setQueueLogsTab] = useState('queue');
  const [queue, setQueue] = useState([]);
  const [logs, setLogs] = useState([]);
  const [sectionCache, setSectionCache] = useState({}); // { [sectionId]: { ts, ranges } }
  const [selectedRangeForEdit, setSelectedRangeForEdit] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedRangeForDelete, setSelectedRangeForDelete] = useState(null);
  const [toast, setToast] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Check for dark mode
  useEffect(() => {
    const checkDarkMode = () => {
      const root = document.documentElement;
      const theme = root.getAttribute('data-theme');
      setIsDarkMode(theme === 'dark');
    };
    
    checkDarkMode();
    
    // Watch for theme changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    
    return () => observer.disconnect();
  }, []);

  const getTabButtonStyle = (isActive) => {
    const baseStyle = {
      padding: '8px 16px',
      fontSize: '14px',
      fontWeight: '500',
      border: 'none',
      borderBottom: '2px solid transparent',
      backgroundColor: 'transparent',
      cursor: 'pointer',
      transition: 'all 0.2s'
    };

    if (isActive) {
      return {
        ...baseStyle,
        color: '#007bff',
        borderBottomColor: '#007bff'
      };
    }

    // Inactive tab - white text in dark mode
    return {
      ...baseStyle,
      color: isDarkMode ? '#ffffff' : '#333'
    };
  };

  const toggleSection = (sectionId) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const toggleDatacenter = (datacenterId) => {
    const newExpanded = new Set(expandedDatacenters);
    if (newExpanded.has(datacenterId)) {
      newExpanded.delete(datacenterId);
    } else {
      newExpanded.add(datacenterId);
    }
    setExpandedDatacenters(newExpanded);
  };

  const toggleRange = (rangeId) => {
    const newExpanded = new Set(expandedRanges);
    if (newExpanded.has(rangeId)) {
      newExpanded.delete(rangeId);
    } else {
      newExpanded.add(rangeId);
    }
    setExpandedRanges(newExpanded);
  };

  const scrollSubmenu = (direction) => {
    if (submenuScrollRef.current) {
      const scrollAmount = 300;
      const newScrollLeft = submenuScrollRef.current.scrollLeft + (direction === 'right' ? scrollAmount : -scrollAmount);
      submenuScrollRef.current.scrollTo({ left: newScrollLeft, behavior: 'smooth' });
    }
  };

  const handleSubmenuScroll = () => {
    if (submenuScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = submenuScrollRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const toggleRangeItem = (rangeId) => {
    const newExpanded = new Set(expandedRangeItems);
    if (newExpanded.has(rangeId)) {
      newExpanded.delete(rangeId);
    } else {
      newExpanded.add(rangeId);
    }
    setExpandedRangeItems(newExpanded);
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const parseCIDR = (cidr) => {
    const [ip, mask] = cidr.split('/');
    const isIPv6 = ip.includes(':');
    return { ip, mask: parseInt(mask), isIPv6 };
  };

  const parseIP = (ip, isIPv6) => {
    if (isIPv6) {
      // Handle expanded IPv6 format
      const parts = ip.split(':');
      const expanded = [];
      let emptyIndex = -1;
      
      for (let i = 0; i < parts.length; i++) {
        if (parts[i] === '') {
          emptyIndex = i;
        } else {
          expanded.push(parseInt(parts[i], 16) || 0);
        }
      }
      
      // Fill in the :: abbreviation
      while (expanded.length < 8) {
        expanded.splice(emptyIndex > 0 ? emptyIndex : expanded.length, 0, 0);
      }
      
      // Expand to full 128-bit representation
      const result = new Array(8).fill(0);
      expanded.forEach((val, i) => {
        if (i < 8) {
          result[i] = val;
        }
      });
      
      return result;
    } else {
      return ip.split('.').map(p => parseInt(p));
    }
  };

  const IPToNumber = (ip, isIPv6) => {
    if (isIPv6) {
      const parts = parseIP(ip, true);
      let result = BigInt(0);
      for (let i = 0; i < parts.length; i++) {
        result = result * BigInt(65536) + BigInt(parts[i]);
      }
      return result;
    } else {
      const parts = parseIP(ip, false);
      return BigInt(parts[0]) * BigInt(16777216) + BigInt(parts[1]) * BigInt(65536) + BigInt(parts[2]) * BigInt(256) + BigInt(parts[3]);
    }
  };

  const numberToIP = (num, isIPv6) => {
    if (isIPv6) {
      const parts = new Array(8).fill(0);
      let n = num;
      
      for (let i = 7; i >= 0; i--) {
        parts[i] = Number(n % BigInt(65536));
        n = n / BigInt(65536);
      }
      
      // Format with abbreviation
      let result = parts.map(p => p.toString(16)).join(':');
      // Compress zeros
      result = result.replace(/(^|:)(0+:){2,}/, '::');
      return result;
    } else {
      const parts = new Array(4).fill(0);
      let n = num;
      
      for (let i = 3; i >= 0; i--) {
        parts[i] = Number(n % BigInt(256));
        n = n / BigInt(256);
      }
      
      return parts.join('.');
    }
  };

  const isSubnet = (parentCIDR, childCIDR) => {
    if (!parentCIDR || !childCIDR) return false;
    
    const parent = parseCIDR(parentCIDR);
    const child = parseCIDR(childCIDR);
    
    // Child must have larger mask (smaller subnet)
    if (child.mask <= parent.mask) return false;
    
    // Check if child IP is within parent range
    // For simplicity, we'll check if child starts with parent's IP prefix
    const parentPrefix = parent.ip.split('/')[0];
    const childStart = child.ip.split('/')[0];
    
    // For IPv6, check if they share the same prefix
    if (parent.isIPv6) {
      const parentParts = parseIP(parentPrefix, true);
      const childParts = parseIP(childStart, true);
      
      // Check if child IP is within parent range
      const maskBytes = Math.floor(parent.mask / 16);
      for (let i = 0; i < maskBytes; i++) {
        if (parentParts[i] !== childParts[i]) return false;
      }
      return true;
    } else {
      // IPv4
      const parentParts = parseIP(parentPrefix, false);
      const childParts = parseIP(childStart, false);
      
      const maskBytes = Math.floor(parent.mask / 8);
      for (let i = 0; i < maskBytes; i++) {
        if (parentParts[i] !== childParts[i]) return false;
      }
      return true;
    }
  };

  const getCIDRInfo = (cidr) => {
    const { ip, mask, isIPv6 } = parseCIDR(cidr);
    const startNum = IPToNumber(ip, isIPv6);
    const totalIPs = isIPv6 
      ? BigInt(2) ** BigInt(128 - mask)
      : BigInt(2) ** BigInt(32 - mask);
    const endNum = startNum + totalIPs - BigInt(1);
    
    return {
      startIP: ip,
      startNum,
      endIP: numberToIP(endNum, isIPv6),
      endNum,
      totalIPs,
      isIPv6,
      mask
    };
  };

  const calculateFreeRanges = (parentRange, childrenRanges) => {
    const cidr = parentRange.metadata?.cidr;
    if (!cidr) {
      console.log('No CIDR for parent range:', parentRange);
      return [];
    }
    
    const parentInfo = getCIDRInfo(cidr);
    
    // Get all direct children (subnets)
    const directChildren = childrenRanges.filter(child => {
      if (!child.metadata?.cidr) return false;
      return isSubnet(cidr, child.metadata.cidr);
    });
    
    console.log('calculateFreeRanges for:', cidr, 'directChildren:', directChildren);
    
    if (directChildren.length === 0) {
      // No children, entire range is free
      const result = [{
        start: parentInfo.startIP,
        end: parentInfo.endIP,
        type: 'free',
        count: parentInfo.totalIPs.toString()
      }];
      console.log('No children, returning:', result);
      return result;
    }
    
    // Get info for each child
    const childrenInfo = directChildren.map(child => {
      const childCIDR = child.metadata?.cidr;
      return {
        ...getCIDRInfo(childCIDR),
        name: child.name || child.description || 'Unnamed',
        child
      };
    });
    
    // Sort by start position
    childrenInfo.sort((a, b) => {
      if (a.startNum < b.startNum) return -1;
      if (a.startNum > b.startNum) return 1;
      return 0;
    });
    
    const freeRanges = [];
    let currentPos = parentInfo.startNum;
    
    childrenInfo.forEach(childInfo => {
      // If there's a gap before this child
      if (childInfo.startNum > currentPos) {
        const freeStart = numberToIP(currentPos, parentInfo.isIPv6);
        const freeEnd = numberToIP(childInfo.startNum - BigInt(1), parentInfo.isIPv6);
        const freeCount = childInfo.startNum - currentPos;
        
        // Guard: avoid phantom 1-IP free block at exact parent start when a /128 child exists
        if (!(freeCount === BigInt(1) && freeStart === parentInfo.startIP)) {
          freeRanges.push({
            start: freeStart,
            end: freeEnd,
            type: 'free',
            count: freeCount.toString(),
            parentId: parentRange.id,  // Add parent ID for API requests
            parentRangeCidr: cidr
          });
        }
      }
      
      // Move current position to end of this child
      currentPos = childInfo.endNum + BigInt(1);
    });
    
    // Check if there's free space at the end
    if (currentPos <= parentInfo.endNum) {
      const freeStart = numberToIP(currentPos, parentInfo.isIPv6);
      const freeEnd = parentInfo.endIP;
      const freeCount = parentInfo.endNum - currentPos + BigInt(1);
      
      freeRanges.push({
        start: freeStart,
        end: freeEnd,
        type: 'free',
        count: freeCount.toString(),
        parentId: parentRange.id,  // Add parent ID for API requests
        parentRangeCidr: cidr
      });
    }
    
    console.log('Free ranges calculated:', freeRanges);
    return freeRanges;
  };



  const buildRangeHierarchy = (ranges) => {
    const rangeMap = new Map();
    const roots = [];
    
    // Create a map of all ranges with children array
    ranges.forEach(range => {
      rangeMap.set(range.id, { ...range, children: [] });
    });
    
    // Build parent-child relationships based on CIDR hierarchy
    ranges.forEach(range => {
      const rangeObj = rangeMap.get(range.id);
      const rangeCIDR = range.metadata?.cidr;
      
      if (!rangeCIDR) {
        // No CIDR, add to roots
        roots.push(rangeObj);
        return;
      }
      
      // Find parent by checking if any other range contains this one
      let parent = null;
      let bestMask = 0;
      
      ranges.forEach(otherRange => {
        const otherCIDR = otherRange.metadata?.cidr;
        if (!otherCIDR || otherRange.id === range.id) return;
        
        if (isSubnet(otherCIDR, rangeCIDR)) {
          const { mask } = parseCIDR(otherCIDR);
          // Choose the most specific parent (largest mask)
          if (mask > bestMask) {
            parent = otherRange;
            bestMask = mask;
          }
        }
      });
      
      if (parent) {
        const parentObj = rangeMap.get(parent.id);
        parentObj.children.push(rangeObj);
      } else {
        roots.push(rangeObj);
      }
    });
    
    // Note: IPs are now added as /128 subnets in PHP-IPAM, so they will appear as children automatically
    // No need to manually add IPs as children here
    
    // Sort children by CIDR
    const sortChildren = (node) => {
      if (node.children.length > 0) {
        node.children.sort((a, b) => {
          const aCIDR = a.metadata?.cidr || '';
          const bCIDR = b.metadata?.cidr || '';
          return aCIDR.localeCompare(bCIDR);
        });
        node.children.forEach(child => sortChildren(child));
      }
    };
    
    roots.forEach(root => sortChildren(root));
    
    return roots;
  };

  const loadIpamDetails = useCallback(async (useLive = false) => {
    if (!id) return;
    try {
      setLoading(true);
      // Use /live endpoint to fetch directly from PHP-IPAM without cache
      const endpoint = useLive ? `/api/ipams/${id}/live` : `/api/ipams/${id}`;
      console.log(`Loading IPAM details from: ${endpoint} (live mode: ${useLive})`);
      
      const response = await fetch(endpoint);
      if (response.ok) {
        const data = await response.json();
        setIpam(data);
        console.log(`✅ Loaded ${data.collections?.ranges?.length || 0} ranges from ${useLive ? 'PHP-IPAM directly' : 'local cache'}`);
      } else {
        setError('Failed to load IPAM details');
      }
    } catch (err) {
      setError('Error loading IPAM details');
      console.error('Error loading IPAM details:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadQueueAndLogs = useCallback(async () => {
    if (!id) return;
    try {
      console.log(`📊 Loading queue and logs for IPAM ${id}...`);
      
      const [queueRes, logsRes] = await Promise.all([
        fetch(`/api/ipams/${id}/queue`),
        fetch(`/api/ipams/${id}/logs`)
      ]);
      
      if (queueRes.ok) {
        const queueData = await queueRes.json();
        console.log(`📋 Queue loaded: ${queueData.length} items`, queueData);
        setQueue(queueData);
      } else {
        console.error(`❌ Queue fetch failed: ${queueRes.status}`);
      }
      
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        console.log(`📜 Logs loaded: ${logsData.length} items`, logsData);
        setLogs(logsData);
      } else {
        console.error(`❌ Logs fetch failed: ${logsRes.status}`);
      }
    } catch (err) {
      console.error('❌ Failed to load queue and logs:', err);
    }
  }, [id]);

  useEffect(() => {
    if (activeTab === 'queue-logs') {
      loadQueueAndLogs();
    }
  }, [activeTab, loadQueueAndLogs]);

  const loadSectionRanges = useCallback(async (sectionId, useLive = false) => {
    if (!id || !sectionId) return;
    // 10-min TTL cache
    const cacheEntry = sectionCache[sectionId];
    const now = Date.now();
    if (!useLive && cacheEntry && now - cacheEntry.ts < 10 * 60 * 1000) {
      setSectionRanges(prev => ({ ...prev, [sectionId]: cacheEntry.ranges }));
      return;
    }

    try {
      // Correct path: /api/ipams/:id/sections/:sectionId or .../sections/:sectionId/live
      const basePath = `/api/ipams/${id}/sections/${sectionId}`;
      const endpoint = useLive ? `${basePath}/live` : basePath;
      console.log(`📡 Loading section ranges from: ${endpoint}`);
      
      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        setSectionRanges(prev => ({ ...prev, [sectionId]: data.ranges || [] }));
        setSectionCache(prev => ({ ...prev, [sectionId]: { ts: Date.now(), ranges: data.ranges || [] } }));
        console.log(`✅ Loaded ${data.ranges?.length || 0} ranges for section ${sectionId}`);
      } else {
        console.error(`❌ Failed to load section ${sectionId}: ${res.status} ${res.statusText}`);
      }
    } catch (e) {
      console.error('❌ Network error loading section ranges:', e);
    }
  }, [id, sectionCache]);

  const handleRetry = async (queueId) => {
    try {
      const res = await fetch(`/api/ipams/${id}/queue/${queueId}/retry`, {
        method: 'POST'
      });
      
      if (res.ok) {
        showToast('Operation queued for retry', 'success');
        loadQueueAndLogs();
      } else {
        showToast('Retry failed', 'error');
      }
    } catch (err) {
      console.error('Retry failed:', err);
      showToast('Retry failed', 'error');
    }
  };

  const handleDeleteQueue = async (queueId) => {
    if (!confirm('Delete this queue item?')) return;
    
    try {
      const res = await fetch(`/api/ipams/${id}/queue/${queueId}`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        showToast('Queue item deleted', 'success');
        loadQueueAndLogs();
      }
    } catch (err) {
      console.error('Delete failed:', err);
      showToast('Delete failed', 'error');
    }
  };

  const handleDeleteLog = async (logId) => {
    if (!confirm('Delete this log entry?')) return;
    
    try {
      const res = await fetch(`/api/ipams/${id}/logs/${logId}`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        showToast('Log entry deleted', 'success');
        loadQueueAndLogs();
      }
    } catch (err) {
      console.error('Delete failed:', err);
      showToast('Delete failed', 'error');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      console.log('🔄 Starting refresh - will queue sync operation...');
      showToast('🔄 Refresh queued - check Queue & Logs tab', 'info');
      
      // Queue a sync operation instead of loading directly
      const response = await fetch(`/api/ipams/${id}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.status === 202) {
        showToast('✅ Refresh operation queued successfully', 'success');
        setActiveTab('queue-logs');
        await loadQueueAndLogs();
      } else if (response.ok) {
        showToast('✅ Refresh completed', 'success');
        await loadIpamDetails(false);
      } else {
        const errorData = await response.json();
        showToast(`⚠️ Refresh queued with status: ${errorData.message || response.statusText}`, 'warning');
        setActiveTab('queue-logs');
        await loadQueueAndLogs();
      }
    } catch (error) {
      console.error('❌ Refresh error:', error);
      showToast('⚠️ Refresh request sent - check Queue & Logs', 'warning');
      setActiveTab('queue-logs');
      await loadQueueAndLogs();
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    // Initial load from cache (fast), user can refresh to get live data
    loadIpamDetails(false); // useLive = false (from cache)
  }, [user, navigate, loadIpamDetails]);

  // Handle route parameters for sections and ranges
  useEffect(() => {
    if (ipam && sections.length > 0) {
      // If we have a sectionId in the URL, select that section
      if (sectionId) {
        const section = sections.find(s => s.id === sectionId || s.name.toLowerCase() === sectionId.toLowerCase());
        if (section) {
          setSelectedSection(section);
          setActiveTab('sections');
        }
      }
    }
  }, [sectionId, ipam, sections]);

  // Build hierarchical structure
  useEffect(() => {
    if (!ipam) return;
    
    const sectionsList = ipam.collections?.sections || [];
    const rangesList = ipam.collections?.ranges || [];
    
    // Group ranges by section
    const rangesBySection = {};
    rangesList.forEach(range => {
      const sectionId = range.metadata?.sectionId;
      if (sectionId) {
        if (!rangesBySection[sectionId]) {
          rangesBySection[sectionId] = [];
        }
        rangesBySection[sectionId].push(range);
      }
    });

    setSections(sectionsList);
    setSectionRanges(rangesBySection);
  }, [ipam]);

  const getSplitOptions = (cidr, usedIPs = []) => {
    const { mask, isIPv6 } = parseCIDR(cidr);
    const maxMask = isIPv6 ? 128 : 32;
    const options = [];
    const parentInfo = getCIDRInfo(cidr);
    
    for (let newMask = mask + 1; newMask <= maxMask && newMask <= mask + 8; newMask++) {
      const subnetCount = Math.pow(2, newMask - mask);
      const ipsPerSubnet = Math.pow(2, maxMask - newMask);
      
      // Check if this split is possible considering allocated IPs
      const canSplit = checkIfSplitPossible(parentInfo, newMask, usedIPs);
      
      options.push({
        newMask,
        subnetCount,
        ipsPerSubnet,
        canSplit,
        reason: canSplit ? null : 'Some subnets would conflict with allocated IPs'
      });
    }
    
    return options;
  };

  const checkIfSplitPossible = (parentInfo, newMask, usedIPs) => {
    // If no IPs are allocated, split is always possible
    if (usedIPs.length === 0) return true;
    
    // For now, simple check: if mask is too high, it might not work
    // This is a simplified check - in a real scenario, you'd check each subnet
    const subnetSize = Math.pow(2, 128 - newMask); // Assuming IPv6 for now
    
    // Check if any used IP would be split across multiple subnets
    // For a proper implementation, we'd need to check all subnets
    return true; // Simplified - needs more sophisticated logic
  };

  const renderRangeItem = (range, level = 0) => {
    const isExpanded = expandedRangeItems.has(range.id);
    const hasChildren = range.children && range.children.length > 0;
    const freeRanges = hasChildren ? calculateFreeRanges(range, range.children) : [];
    
    // Get parent info for free range calculations
    const parentInfo = range.metadata?.cidr ? getCIDRInfo(range.metadata.cidr) : null;
    
    // Debug logging
    if (range.metadata?.cidr === '2001:41d0:a:1918::/64') {
      console.log('=== RENDER RANGE DEBUG ===');
      console.log('CIDR:', range.metadata.cidr);
      console.log('hasChildren:', hasChildren);
      console.log('isExpanded:', isExpanded);
      console.log('children:', range.children);
      console.log('freeRanges:', freeRanges);
      console.log('======================');
    }
    
    // Check if range can be split (has more than 4 IPs and has CIDR)
    let canSplit = false;
    let splitOptions = [];
    if (range.metadata?.cidr) {
      const info = getCIDRInfo(range.metadata.cidr);
      canSplit = info.totalIPs > BigInt(4);
      if (canSplit) {
        splitOptions = getSplitOptions(range.metadata.cidr);
      }
    }
    
    return (
      <div key={range.id} style={{ marginLeft: `${level * 24}px` }}>
        <div 
          style={{ 
            padding: hasChildren ? '12px 16px' : '16px',
            backgroundColor: '#ffffff',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            marginBottom: '8px',
            cursor: hasChildren ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px'
          }}
        >
          {hasChildren && (
            <div 
              className={`ipam-expand-icon ${isExpanded ? 'expanded' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                toggleRangeItem(range.id);
              }}
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              <ChevronRightIcon />
            </div>
          )}
          <div 
            style={{ flex: 1 }}
            onClick={() => hasChildren && toggleRangeItem(range.id)}
          >
            {range.metadata?.cidr ? (
              <>
                <div style={{ fontWeight: '600', color: '#333', fontSize: '14px', marginBottom: '4px', fontFamily: 'monospace' }}>
                  {range.metadata.cidr}
                </div>
                <div style={{ fontSize: '12px', color: '#666', fontFamily: 'monospace', marginBottom: '2px' }}>
                  {(() => {
                    const info = getCIDRInfo(range.metadata.cidr);
                    return `${info.startIP} - ${info.endIP}`;
                  })()}
                </div>
                <div style={{ fontSize: '12px', color: '#999' }}>
                  {range.name || range.description || 'No description'}
                </div>
              </>
            ) : (
              <>
                <div style={{ fontWeight: '600', color: '#333', fontSize: '14px', marginBottom: '4px' }}>
                  {range.name || 'Unnamed Range'}
                </div>
                <div style={{ fontSize: '12px', color: '#999' }}>
                  {range.description || 'No description'}
                </div>
              </>
            )}
            {range.metadata?.cidr && (() => {
              const info = getCIDRInfo(range.metadata.cidr);
              const formattedCount = info.totalIPs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
              return (
                <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                  {formattedCount} IP addresses
                </div>
              );
            })()}
            {!range.metadata?.cidr && range.ips && range.ips.length > 0 && (
              <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                {range.ips.length} IP addresses
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            {canSplit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedRangeForSplit({ range, options: splitOptions });
                  setShowSplitModal(true);
                }}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '500',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#0056b3'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#007bff'}
              >
                Split
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedRangeForEdit(range);
                setShowEditModal(true);
              }}
              style={{
                padding: '6px 12px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '500',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#218838'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#28a745'}
            >
              Edit
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedRangeForDelete(range);
                setShowDeleteModal(true);
              }}
              style={{
                padding: '6px 12px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '500',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#c82333'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#dc3545'}
            >
              Delete
            </button>
          </div>
        </div>
        {isExpanded && hasChildren && (
          <div style={{ marginLeft: '8px' }}>
            {/* Merge and sort children and free ranges by position */}
            {(() => {
              // Create a merged array with position info
              const mergedItems = [];
              
              // Add children with their start position
              range.children.forEach(child => {
                if (child.metadata?.cidr) {
                  const childInfo = getCIDRInfo(child.metadata.cidr);
                  mergedItems.push({
                    type: 'used',
                    item: child,
                    startNum: childInfo.startNum,
                    level: level + 1
                  });
                }
              });
              
              // Add free ranges with their start position
              freeRanges.forEach((freeRange, idx) => {
                const freeStartNum = IPToNumber(freeRange.start, parentInfo.isIPv6);
                mergedItems.push({
                  type: 'free',
                  freeRange,
                  startNum: freeStartNum,
                  level: level + 1,
                  idx
                });
              });
              
              // Sort by start position
              mergedItems.sort((a, b) => {
                if (a.startNum < b.startNum) return -1;
                if (a.startNum > b.startNum) return 1;
                return 0;
              });
              
              // Render merged items
              return mergedItems.map((item, idx) => {
                if (item.type === 'used') {
                  return renderRangeItem(item.item, item.level);
                } else {
                  const formattedCount = item.freeRange.count.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                  const isSingleIP = item.freeRange.count === '1';
                  const cidrMask = isSingleIP ? 128 : 64;
                  
                  return (
                    <div key={`free-${item.idx}`} style={{
                      padding: '10px 14px',
                      backgroundColor: '#d4edda',
                      border: '1px solid #c3e6cb',
                      borderRadius: '6px',
                      fontSize: '12px',
                      color: '#155724',
                      marginLeft: `${item.level * 24}px`,
                      marginTop: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <div>
                        <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                          <span style={{ fontSize: '16px', verticalAlign: 'middle' }}>+</span> Free space
                        </div>
                        <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#0c5460' }}>
                          {item.freeRange.start} - {item.freeRange.end}
                        </div>
                        <div style={{ fontSize: '11px', marginTop: '2px' }}>
                          ({formattedCount} IPs)
                        </div>
                      </div>
                      {isSingleIP ? (
                        <button
                                            onClick={(e) => {
                    e.stopPropagation();
                    // For single IP, open add modal directly
                    console.log('📝 Opening Add IP modal for free space:', item.freeRange);
                    setSelectedRangeForEdit({ 
                      metadata: { 
                        cidr: `${item.freeRange.start}/${cidrMask}`,
                        parentRangeCidr: range.metadata?.cidr || '',
                        parentId: item.freeRange.parentId || range.id  // Use parentId from freeRange
                      },
                      name: '',
                      description: ''
                    });
                    setShowAddModal(true);
                  }}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '500',
                            transition: 'background-color 0.2s',
                            marginLeft: '12px'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#218838'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = '#28a745'}
                        >
                          Add IP
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // For ranges, show split options
                            const cidrInfo = getCIDRInfo(`${item.freeRange.start}/${cidrMask}`);
                            const options = getSplitOptions(`${item.freeRange.start}/${cidrMask}`);
                            setSelectedRangeForSplit({ 
                              range: { metadata: { cidr: `${item.freeRange.start}/${cidrMask}` } },
                              options: options,
                              freeRange: item.freeRange
                            });
                            setShowSplitModal(true);
                          }}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '500',
                            transition: 'background-color 0.2s',
                            marginLeft: '12px'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#0056b3'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = '#007bff'}
                        >
                          Split
                        </button>
                      )}
                    </div>
                  );
                }
              });
            })()}
          </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    // Check scroll position after data loads or tab changes
    if (activeTab === 'sections' && ipam && sections.length > 0) {
      setTimeout(() => {
        handleSubmenuScroll();
      }, 100);
    }
  }, [activeTab, ipam, sections.length]);

  if (loading) {
    return (
      <div className="container">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-tertiary">Loading IPAM details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <button 
              onClick={loadIpamDetails}
              className="btn btn--primary"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!ipam) {
    return (
      <div className="container">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-tertiary">IPAM not found</p>
            <button 
              onClick={() => navigate('/ipam')}
              className="btn btn--primary mt-4"
            >
              Back to IPAM
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/ipam')}
            className="btn btn--ghost btn--sm"
            title="Back to IPAM list"
          >
            <BackIcon />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-primary">{ipam.name}</h1>
            <p className="text-tertiary">{ipam.baseUrl}</p>
          </div>
        </div>
      </div>

      {/* Status Card */}
      <div className="ipam-status-card">
        <div className="ipam-status-content">
          <div className={`ipam-status-dot ${
            ipam.status === 'connected' ? 'connected' : 
            ipam.status === 'failed' ? 'failed' : 
            'unknown'
          }`}></div>
          <span style={{ fontWeight: '500', fontSize: '15px', color: '#333' }}>
            Status: {ipam.status || 'unknown'}
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
            {ipam.lastCheckedAt && (
              <span style={{ fontSize: '13px', color: '#666' }}>
                Last checked: {new Date(ipam.lastCheckedAt).toLocaleString()}
              </span>
            )}
        <button 
          onClick={async () => {
            await handleRefresh();
          }}
          disabled={refreshing}
              className="ipam-refresh-button"
              title="Refresh status"
        >
          {refreshing ? (
                <div style={{ 
                  width: '16px', 
                  height: '16px', 
                  border: '2px solid #007bff', 
                  borderTop: '2px solid transparent',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite'
                }}></div>
          ) : (
            <RefreshIcon />
          )}
        </button>
          </div>
        </div>
      </div>

       {/* Tab Navigation */}
       <div style={ipamStyles.tabNav}>
         {[
           { id: 'overview', label: 'Overview' },
           { id: 'sections', label: 'Sections' },
           { id: 'datacenters', label: 'Datacenters' },
           { id: 'ranges', label: 'IP Ranges' },
           { id: 'queue-logs', label: '📋 Queue & Logs' }
         ].map((tab) => (
           <button
             key={tab.id}
             onClick={() => setActiveTab(tab.id)}
             style={getTabButtonStyle(activeTab === tab.id)}
           >
             {tab.label}
           </button>
         ))}
          </div>

       {/* Tab Content */}
      {activeTab === 'overview' && (
        <div style={{ padding: '40px 0' }}>
          {/* Statistics Grid */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div className="ipam-stats-grid">
                             {/* Sections */}
                <div className="ipam-stat-card" onClick={() => setActiveTab('sections')} style={{ cursor: 'pointer' }}>
                  <div className="ipam-stat-icon">
                    <NetworkIcon />
        </div>
                  <div className="ipam-stat-number">{sections.length}</div>
                  <p className="ipam-stat-label">Sections</p>
      </div>

              {/* Datacenters */}
              <div className="ipam-stat-card" onClick={() => setActiveTab('datacenters')} style={{ cursor: 'pointer' }}>
                <div className="ipam-stat-icon">
                  <BuildingIcon />
                </div>
                <div className="ipam-stat-number">{ipam.collections?.datacenters?.length || 0}</div>
                <p className="ipam-stat-label">Datacenters</p>
              </div>

              {/* IP Ranges */}
              <div className="ipam-stat-card" onClick={() => setActiveTab('ranges')} style={{ cursor: 'pointer' }}>
                <div className="ipam-stat-icon">
                  <DatabaseIcon />
                </div>
                <div className="ipam-stat-number">{ipam.collections?.ranges?.length || 0}</div>
                <p className="ipam-stat-label">IP Ranges</p>
              </div>

              {/* Total IPs */}
              <div className="ipam-stat-card" onClick={() => setActiveTab('ranges')} style={{ cursor: 'pointer' }}>
                <div className="ipam-stat-icon">
                  <FolderIcon />
                </div>
                <div className="ipam-stat-number">
                  {ipam.collections?.ranges?.reduce((total, range) => total + (range.ips?.length || 0), 0) || 0}
                </div>
                <p className="ipam-stat-label">Total IPs</p>
              </div>
            </div>
          </div>

        </div>
      )}

      {activeTab === 'datacenters' && (
      <>
          {/* Horizontal scrollable datacenter cards */}
          <div className="ipam-submenu-container">
            <div 
              className="ipam-submenu-wrapper"
              style={{ 
                display: 'flex', 
                gap: '16px', 
                overflowX: 'auto',
                padding: '16px',
                scrollbarWidth: 'thin'
              }}
            >
              {ipam.collections?.datacenters && ipam.collections.datacenters.length > 0 ? (
                ipam.collections.datacenters.map((datacenter) => {
                  const isExpanded = expandedDatacenters.has(datacenter.id);
                  
                  return (
                    <div 
                      key={datacenter.id} 
                      className="border border-border rounded-lg"
                      style={{
                        minWidth: '280px',
                        maxWidth: '320px',
                        backgroundColor: 'var(--surface)',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div 
                        className="flex flex-col p-4 cursor-pointer hover:bg-surface-secondary"
                        onClick={() => toggleDatacenter(datacenter.id)}
                        style={{ gap: '8px' }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {isExpanded ? <MinusIcon /> : <PlusIcon />}
                            <h3 className="font-semibold text-primary">{datacenter.name}</h3>
                          </div>
                          <span className="text-sm text-tertiary">ID: {datacenter.id}</span>
                        </div>
                        <p className="text-sm text-tertiary">{datacenter.description || 'No description'}</p>
                        
                        {isExpanded && (
                          <div className="border-t border-border pt-3 mt-2">
                            <div className="text-sm text-tertiary space-y-2">
                              <p><strong>Address:</strong> {datacenter.address || 'Not specified'}</p>
                              {datacenter.location && (
                                <p><strong>Location:</strong> {datacenter.location}</p>
                              )}
                              {datacenter.capacity && (
                                <p><strong>Capacity:</strong> {datacenter.capacity}</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-tertiary text-center py-8" style={{ width: '100%' }}>No datacenters found</p>
              )}
            </div>
          </div>
        </>
      )}

             {activeTab === 'sections' && (
         <>
           {/* Sub-menu for sections with scroll */}
           <div className="ipam-submenu-container">
             {showLeftArrow && (
               <button
                 className="ipam-scroll-indicator ipam-scroll-indicator-left"
                 onClick={() => scrollSubmenu('left')}
               >
                 <ChevronLeftIcon />
               </button>
             )}
             <div 
               className="ipam-submenu-wrapper"
               ref={submenuScrollRef}
               onScroll={handleSubmenuScroll}
               style={{ ...ipamStyles.tabNav, gap: '0' }}
             >
              {sections.map((section) => {
                const sectionRangesList = sectionRanges[section.id] || [];
                const topLevelCount = sectionRangesList.filter(r => !r?.metadata?.masterSubnetId || r?.metadata?.masterSubnetId == 0).length;
                 return (
                  <button
                     key={section.id}
                     onClick={() => {
                       setSelectedSection(section);
                       navigate(`/ipam/${id}/sections/${section.id}`);
                       setActiveTab('sections');
                      loadSectionRanges(section.id, false);
                     }}
                     style={{
                       ...ipamStyles.tabButton,
                       ...(selectedSection?.id === section.id ? ipamStyles.tabButtonActive : {}),
                       whiteSpace: 'nowrap'
                     }}
                  >
                    {section.name} ({topLevelCount})
                   </button>
                 );
               })}
             </div>
             {showRightArrow && (
               <button
                 className="ipam-scroll-indicator ipam-scroll-indicator-right"
                 onClick={() => scrollSubmenu('right')}
               >
                 <ChevronRightIcon />
               </button>
             )}
           </div>

           {/* Selected section content */}
           {selectedSection ? (
             <div className="ipam-card">
               <div className="ipam-card-header">
                 <h2 className="ipam-card-title">
                   <NetworkIcon />
                   {selectedSection.name}
                 </h2>
               </div>
               <div className="ipam-card-content">
                 <div style={{ marginBottom: '16px' }}>
                   <p style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
                     <strong>Description:</strong> {selectedSection.description || 'No description'}
                   </p>
                   {selectedSection.metadata?.vlanId && (
                     <p style={{ fontSize: '14px', color: '#666' }}>
                       <strong>VLAN ID:</strong> {selectedSection.metadata.vlanId}
                     </p>
                   )}
                 </div>

                 <div>
                  <h4 style={{ fontSize: '15px', fontWeight: '600', color: '#333', marginBottom: '12px' }}>
                    {(() => {
                      const list = sectionRanges[selectedSection.id] || [];
                      const topOnly = list.filter(r => !r?.metadata?.masterSubnetId || r?.metadata?.masterSubnetId == 0);
                      return `IP Ranges (${topOnly.length})`;
                    })()}
                  </h4>
                  {(() => {
                    const list = sectionRanges[selectedSection.id] || [];
                    const topOnly = list.filter(r => !r?.metadata?.masterSubnetId || r?.metadata?.masterSubnetId == 0);
                    return topOnly.length > 0 ? (
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {buildRangeHierarchy(list).map((range) => 
                         renderRangeItem(range, 0)
                       )}
                     </div>
                  ) : (
                     <p style={{ textAlign: 'center', color: '#666', padding: '32px' }}>
                       No ranges in this section
                     </p>
                  );
                  })()}
                 </div>
               </div>
             </div>
           ) : (
             <div className="ipam-card">
               <div className="ipam-card-content">
                 <p style={{ textAlign: 'center', color: '#666', padding: '32px' }}>
                   Please select a section from the menu above
                 </p>
               </div>
             </div>
           )}
         </>
       )}

      {activeTab === 'ranges' && (
        <div className="card">
          <div className="card__header">
            <h2 className="card__title flex items-center gap-2">
              <DatabaseIcon />
              {(() => {
                const list = ipam.collections?.ranges || [];
                const top = list.filter(r => !r?.metadata?.masterSubnetId || r?.metadata?.masterSubnetId == 0);
                return `IP Ranges (${top.length})`;
              })()}
            </h2>
          </div>
          <div className="card__content">
            {(((ipam.collections?.ranges || []).filter(r => !r?.metadata?.masterSubnetId || r?.metadata?.masterSubnetId == 0)).length > 0) ? (
              <div className="space-y-2">
                {(ipam.collections?.ranges || []).filter(r => !r?.metadata?.masterSubnetId || r?.metadata?.masterSubnetId == 0).map((range) => {
                  const isExpanded = expandedRanges.has(range.id);
                              
                              return (
                    <div key={range.id} className="border border-border rounded-lg">
                                  <div 
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-secondary"
                                    onClick={() => toggleRange(range.id)}
                                  >
                                    <div className="flex items-center gap-3">
                          {isExpanded ? <MinusIcon /> : <PlusIcon />}
                                      <div>
                            {range.metadata?.cidr ? (
                              <>
                                <h3 className="font-semibold text-primary font-mono">{range.metadata.cidr}</h3>
                                <p className="text-sm text-tertiary">{range.name || range.description || 'No description'}</p>
                              </>
                            ) : (
                              <>
                                <h3 className="font-semibold text-primary">{range.name || 'Unnamed Range'}</h3>
                                <p className="text-sm text-tertiary">{range.description || 'No description'}</p>
                              </>
                            )}
                                      </div>
                                    </div>
                                    <div className="text-sm text-tertiary">
                          {range.ips ? `${range.ips.length} IPs` : '0 IPs'}
                                    </div>
                                  </div>
                                  
                      {isExpanded && (
                        <div className="border-t border-border p-4 bg-surface-secondary">
                          <div className="text-sm text-tertiary space-y-2 mb-4">
                                          <p><strong>ID:</strong> {range.id}</p>
                                          <p><strong>Name:</strong> {range.name || 'Unnamed'}</p>
                                          <p><strong>Description:</strong> {range.description || 'No description'}</p>
                                          {range.metadata?.cidr && (
                                            <p><strong>CIDR:</strong> {range.metadata.cidr}</p>
                                          )}
                                          {range.metadata?.vlanId && (
                                            <p><strong>VLAN ID:</strong> {range.metadata.vlanId}</p>
                                          )}
                            {range.metadata?.sectionId && (
                              <p><strong>Section ID:</strong> {range.metadata.sectionId}</p>
                            )}
                                        </div>
                                        
                                        {/* IP Addresses within this range */}
                                        {range.ips && range.ips.length > 0 && (
                            <div>
                              <h4 className="font-medium text-primary mb-2">IP Addresses ({range.ips.length})</h4>
                              <div className="space-y-2 max-h-60 overflow-y-auto">
                                {range.ips.slice(0, 20).map((ip) => (
                                                <div key={ip.id} className="flex items-center justify-between p-2 bg-surface rounded border">
                                                  <div>
                                                    <p className="font-medium text-primary">{ip.ip}</p>
                                                    <p className="text-sm text-tertiary">{ip.hostname || 'No hostname'}</p>
                                                    {ip.description && (
                                                      <p className="text-xs text-tertiary">{ip.description}</p>
                                                    )}
                                                  </div>
                                                  <div className="text-xs text-tertiary">
                                                    <p>State: {ip.state}</p>
                                                    {ip.owner && <p>Owner: {ip.owner}</p>}
                                                    {ip.mac && <p>MAC: {ip.mac}</p>}
                                                  </div>
                                                </div>
                                              ))}
                                {range.ips.length > 20 && (
                                                <p className="text-center text-tertiary py-2">
                                    Showing first 20 of {range.ips.length} IPs
                                                </p>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-tertiary text-center py-8">No IP ranges found</p>
                        )}
          </div>
                      </div>
                    )}

      {/* Split Modal */}
      {showSplitModal && selectedRangeForSplit && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setShowSplitModal(false)}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>
              Split Range: {selectedRangeForSplit.range.metadata?.cidr}
            </h2>
            
            {/* Show free ranges if available */}
            {(() => {
              const freeRanges = selectedRangeForSplit.range.children ? 
                calculateFreeRanges(selectedRangeForSplit.range, selectedRangeForSplit.range.children) : [];
              
              if (freeRanges.length > 0) {
                return (
                  <div style={{ marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>Available Free Space:</h3>
                    {freeRanges.map((freeRange, idx) => {
                      const formattedCount = freeRange.count.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                      return (
                        <div key={idx} style={{
                          padding: '10px 12px',
                          backgroundColor: '#d4edda',
                          border: '1px solid #c3e6cb',
                          borderRadius: '6px',
                          marginBottom: '6px',
                          fontSize: '12px'
                        }}>
                          <div style={{ fontWeight: '600', color: '#155724', marginBottom: '2px' }}>
                            + Free space
                          </div>
                          <div style={{ fontFamily: 'monospace', color: '#0c5460' }}>
                            {freeRange.start} - {freeRange.end}
                          </div>
                          <div style={{ color: '#155724' }}>
                            ({formattedCount} IPs available)
                          </div>
                  </div>
                );
              })}
            </div>
                );
              }
              return null;
            })()}

            <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
              Select how you want to split this range:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              {selectedRangeForSplit.options.map((option, idx) => {
                const { mask } = parseCIDR(selectedRangeForSplit.range.metadata.cidr);
                const formattedCount = option.ipsPerSubnet.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      if (!option.canSplit) {
                        showToast(`Cannot split: ${option.reason}`, 'error');
                        return;
                      }
                      showToast(`Selected: Split into ${option.subnetCount} subnets of /${option.newMask} (${formattedCount} IPs each)`, 'info');
                      setShowSplitModal(false);
                    }}
                    disabled={!option.canSplit}
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      border: option.canSplit ? '1px solid #e0e0e0' : '1px solid #ffc107',
                      borderRadius: '6px',
                      backgroundColor: option.canSplit ? '#fff' : '#fff9e6',
                      cursor: option.canSplit ? 'pointer' : 'not-allowed',
                      transition: 'all 0.2s',
                      opacity: option.canSplit ? 1 : 0.7
                    }}
                    onMouseEnter={(e) => {
                      if (option.canSplit) {
                        e.target.style.borderColor = '#007bff';
                        e.target.style.backgroundColor = '#f8f9fa';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (option.canSplit) {
                        e.target.style.borderColor = '#e0e0e0';
                        e.target.style.backgroundColor = '#fff';
                      }
                    }}
                  >
                    <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>
                      /{option.newMask} ({option.subnetCount} subnets)
                      {!option.canSplit && <span style={{ color: '#ffc107', marginLeft: '8px' }}>⚠️ Conflicts with allocated IPs</span>}
        </div>
                    <div style={{ fontSize: '13px', color: '#666' }}>
                      {formattedCount} IPs per subnet
                    </div>
                  </button>
                );
              })}
      </div>

            <button
              onClick={() => setShowSplitModal(false)}
              style={{
                padding: '10px 20px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedRangeForEdit && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setShowEditModal(false)}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px' }}>
              Edit Range
          </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                  Description
                </label>
                <input
                  type="text"
                  defaultValue={selectedRangeForEdit.name || selectedRangeForEdit.description || ''}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
        </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                  CIDR
                </label>
                <input
                  type="text"
                  defaultValue={selectedRangeForEdit.metadata?.cidr || ''}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'monospace'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowEditModal(false)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    const description = document.querySelector('input[type="text"]').value;
                    const cidr = document.querySelectorAll('input[type="text"]')[1].value;
                    
                    const response = await fetch(`/api/ipams/${ipam.id}/ranges`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        sectionId: selectedSection?.id,
                        metadata: { cidr },
                        description,
                        name: description
                      })
                    });
                    
                    const responseData = await response.json();
                    
                    if (response.status === 202) {
                      showToast('✅ Queued: operation is processing. Check Queue & Logs tab.', 'info');
                      setShowEditModal(false);
                      setShowAddModal(false);
                      setActiveTab('queue-logs');
                      await loadQueueAndLogs();
                    } else if (response.ok) {
                      showToast('✅ IP added successfully', 'success');
                      await loadIpamDetails();
                      setShowEditModal(false);
                      setShowAddModal(false);
                    } else {
                      showToast(`⚠️ ${responseData.message || 'Request queued with errors. Check Queue & Logs.'}`, 'error');
                      setShowEditModal(false);
                      setShowAddModal(false);
                      setActiveTab('queue-logs');
                      await loadQueueAndLogs();
                    }
                  } catch (error) {
                    showToast('⚠️ Request submitted. Check Queue & Logs for status.', 'error');
                    setShowEditModal(false);
                    setShowAddModal(false);
                    setActiveTab('queue-logs');
                    await loadQueueAndLogs();
                  }
                  }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Save
              </button>
                        </div>
          </div>
                      </div>
                    )}

      {/* Queue & Logs Tab */}
      {activeTab === 'queue-logs' && (
        <div style={{ padding: '20px 0' }}>
          {/* Sub-tabs for Queue & Logs */}
          <div style={{ 
            display: 'flex', 
            gap: '10px', 
            marginBottom: '20px',
            borderBottom: '2px solid #e0e0e0'
          }}>
            <button
              onClick={() => setQueueLogsTab('queue')}
              style={{
                padding: '12px 24px',
                border: 'none',
                borderBottom: queueLogsTab === 'queue' ? '3px solid #007bff' : 'none',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: queueLogsTab === 'queue' ? '600' : '400',
                color: queueLogsTab === 'queue' ? '#007bff' : '#666'
              }}
            >
              Queue ({queue.length})
            </button>
            <button
              onClick={() => setQueueLogsTab('logs')}
              style={{
                padding: '12px 24px',
                border: 'none',
                borderBottom: queueLogsTab === 'logs' ? '3px solid #007bff' : 'none',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: queueLogsTab === 'logs' ? '600' : '400',
                color: queueLogsTab === 'logs' ? '#007bff' : '#666'
              }}
            >
              Logs ({logs.length})
            </button>
          </div>

          {/* Queue Content */}
          {queueLogsTab === 'queue' && (
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
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                            <span style={{ fontSize: '16px', fontWeight: '600', textTransform: 'uppercase' }}>
                              {item.type.replace(/_/g, ' ')}
                            </span>
                            <span style={{
                              padding: '4px 12px',
                              borderRadius: '12px',
                              backgroundColor: item.status === 'pending' ? '#ffc107' : item.status === 'processing' ? '#17a2b8' : item.status === 'completed' ? '#28a745' : '#dc3545',
                              color: 'white',
                              fontSize: '12px',
                              fontWeight: '600',
                              textTransform: 'uppercase'
                            }}>
                              {item.status}
                            </span>
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

          {/* Logs Content */}
          {queueLogsTab === 'logs' && (
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
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                            <span style={{ fontSize: '16px', fontWeight: '600', textTransform: 'uppercase' }}>
                              {item.type.replace(/_/g, ' ')}
                            </span>
                            <span style={{
                              padding: '4px 12px',
                              borderRadius: '12px',
                              backgroundColor: item.status === 'success' ? '#28a745' : '#dc3545',
                              color: 'white',
                              fontSize: '12px',
                              fontWeight: '600',
                              textTransform: 'uppercase'
                            }}>
                              {item.status}
                            </span>
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
                                backgroundColor: 'var(--surface-elevated)',
                                borderRadius: '4px',
                                fontSize: '12px',
                                overflow: 'auto',
                                color: 'var(--primary)'
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
                              backgroundColor: 'var(--surface-elevated)',
                              borderRadius: '4px',
                              fontSize: '12px',
                              overflow: 'auto',
                              color: 'var(--primary)'
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
      )}

      {/* Add IP Modal */}
      {showAddModal && selectedRangeForEdit && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setShowAddModal(false)}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '12px',
            padding: '28px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
          }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '22px', fontWeight: '600', marginBottom: '20px', color: '#333' }}>
              Add IP Address
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#555' }}>
                  Description / Hostname
                </label>
                <input
                  type="text"
                  placeholder="Enter hostname or description"
                  id="add-description"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#007bff'}
                  onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#555' }}>
                  IP Address (CIDR)
                </label>
                <input
                  type="text"
                  defaultValue={selectedRangeForEdit.metadata?.cidr || ''}
                  id="add-cidr"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontFamily: 'monospace',
                    backgroundColor: '#f8f9fa',
                    transition: 'border-color 0.2s'
                  }}
                  readOnly
                />
                      </div>
                    </div>
                    
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowAddModal(false)}
                style={{
                  padding: '10px 24px',
                  backgroundColor: '#f8f9fa',
                  color: '#333',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#e9ecef';
                  e.target.style.borderColor = '#dee2e6';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#f8f9fa';
                  e.target.style.borderColor = '#e0e0e0';
                }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    const description = document.getElementById('add-description').value || '';
                    const cidr = document.getElementById('add-cidr').value;
                    
                    if (!description.trim()) {
                      showToast('Please enter a description or hostname', 'error');
                      return;
                    }
                    
                    // Get parent range CIDR from selectedRangeForEdit metadata
                    const parentRangeCidr = selectedRangeForEdit?.metadata?.parentRangeCidr || '';
                    
                    // Find the actual parent subnet ID from the IPAM collections
                    // This is the subnet/range that contains this free space
                    let parentSubnetId = null;
                    
                    // First check if selectedRangeForEdit has a parent ID directly
                    if (selectedRangeForEdit?.metadata?.parentId) {
                      parentSubnetId = parseInt(selectedRangeForEdit.metadata.parentId);
                      console.log(`📌 Using parent ID from metadata: ${parentSubnetId}`);
                    }
                    // Otherwise try to find by CIDR
                    else if (parentRangeCidr) {
                      const parentSubnet = ipam.collections?.ranges?.find(range => {
                        const rangeCidr = range.metadata?.cidr || '';
                        return rangeCidr === parentRangeCidr;
                      });
                      
                      if (parentSubnet && parentSubnet.id) {
                        parentSubnetId = parseInt(parentSubnet.id);
                        console.log(`📌 Found parent subnet ID by CIDR: ${parentSubnetId} for CIDR: ${parentRangeCidr}`);
                      }
                    }
                    
                    // If still no parent, check if we're adding within selectedSection
                    if (!parentSubnetId && selectedSection?.ranges?.[0]?.id) {
                      parentSubnetId = parseInt(selectedSection.ranges[0].id);
                      console.log(`📌 Using first range from section as parent: ${parentSubnetId}`);
                    }
                    
                    console.log('📋 Add IP Request:', {
                      cidr,
                      description,
                      parentSubnetId,
                      parentRangeCidr,
                      sectionId: selectedSection?.id
                    });
                    
                    const response = await fetch(`/api/ipams/${ipam.id}/ranges`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        sectionId: selectedSection?.id,
                        metadata: { 
                          cidr,
                          subnetId: parentSubnetId,
                          parentRangeCidr: parentRangeCidr
                        },
                        description,
                        name: description
                      })
                    });
                    
                    const responseData = await response.json();
                    
                    if (response.status === 202) {
                      // Queued: do not reload immediately
                      showToast('✅ Queued: operation is processing. Check Queue & Logs tab.', 'info');
                      setShowAddModal(false);
                      setActiveTab('queue-logs');
                      await loadQueueAndLogs();
                    } else if (response.ok) {
                      // Fallback for older behavior
                      showToast('✅ IP added successfully', 'success');
                      setShowAddModal(false);
                      await loadIpamDetails(true);
                    } else {
                      // Even errors should be queued - show message and redirect to queue
                      showToast(`⚠️ ${responseData.message || 'Request queued with errors. Check Queue & Logs.'}`, 'error');
                      setShowAddModal(false);
                      setActiveTab('queue-logs');
                      await loadQueueAndLogs();
                    }
                  } catch (error) {
                    // Network/parse errors - still redirect to queue
                    showToast('⚠️ Request submitted. Check Queue & Logs for status.', 'error');
                    setShowAddModal(false);
                    setActiveTab('queue-logs');
                    await loadQueueAndLogs();
                  }
                }}
                style={{
                  padding: '10px 24px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s',
                  boxShadow: '0 2px 4px rgba(40, 167, 69, 0.2)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#218838';
                  e.target.style.boxShadow = '0 4px 8px rgba(40, 167, 69, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#28a745';
                  e.target.style.boxShadow = '0 2px 4px rgba(40, 167, 69, 0.2)';
                }}
              >
                Add IP
              </button>
            </div>
                        </div>
                      </div>
                    )}

      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          backgroundColor: toast.type === 'success' ? '#28a745' : '#dc3545',
          color: 'white',
          padding: '16px 24px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          animation: 'slideIn 0.3s ease-out',
          minWidth: '300px'
        }}>
          <div style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px'
          }}>
            {toast.type === 'success' ? '✓' : '✕'}
                  </div>
          <span style={{ fontSize: '14px', fontWeight: '500' }}>
            {toast.message}
          </span>
            </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && selectedRangeForDelete && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setShowDeleteModal(false)}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '400px',
            width: '90%'
          }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>
              Delete Range
            </h2>
            
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
              Are you sure you want to delete this range?
            </p>
            
            <div style={{ backgroundColor: '#f8f9fa', padding: '12px', borderRadius: '6px', marginBottom: '20px', fontSize: '13px' }}>
              <strong>{selectedRangeForDelete.metadata?.cidr || selectedRangeForDelete.name}</strong>
              <br />
              <span style={{ color: '#666' }}>
                {selectedRangeForDelete.description || 'No description'}
              </span>
        </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowDeleteModal(false)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    console.log('🗑️ Deleting range:', selectedRangeForDelete.id);
                    const response = await fetch(`/api/ipams/${ipam.id}/ranges/${selectedRangeForDelete.id}`, {
                      method: 'DELETE'
                    });
                    
                    const responseData = await response.json();
                    
                    if (response.status === 202) {
                      showToast('✅ Delete queued - check Queue & Logs tab', 'success');
                      setShowDeleteModal(false);
                      setActiveTab('queue-logs');
                      await loadQueueAndLogs();
                    } else if (response.ok) {
                      showToast('✅ Range deleted successfully', 'success');
                      setShowDeleteModal(false);
                      await loadIpamDetails(false);
                    } else {
                      showToast(`⚠️ ${responseData.message || 'Delete queued with errors. Check Queue & Logs.'}`, 'error');
                      setShowDeleteModal(false);
                      setActiveTab('queue-logs');
                      await loadQueueAndLogs();
                    }
                  } catch (error) {
                    showToast('⚠️ Delete request sent - check Queue & Logs', 'warning');
                    setShowDeleteModal(false);
                    setActiveTab('queue-logs');
                    await loadQueueAndLogs();
                  }
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Delete
              </button>
      </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IPAMDetails;