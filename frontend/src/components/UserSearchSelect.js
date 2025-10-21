import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, X, ChevronDown, User, Check } from 'lucide-react';
import http from '../services/http';

/**
 * UserSearchSelect - Reusable component for searching and selecting users
 * Supports: debounced search, pagination, single/multi-select
 */
const UserSearchSelect = ({ 
  value = [],           // Array of selected user IDs (multi-select) or single ID
  onChange,             // Callback(selectedUsers) 
  multiple = true,      // Enable multi-select
  placeholder = 'Tìm kiếm người dùng...',
  disabled = false,
  maxHeight = '300px',
  showAvatar = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState([]);
  
  const dropdownRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  // Load selected users details on mount
  useEffect(() => {
    if (value && value.length > 0) {
      loadSelectedUsers();
    }
  }, []);

  const loadSelectedUsers = async () => {
    try {
      const ids = Array.isArray(value) ? value : [value];
      if (ids.length === 0) return;

      const response = await http.get('/admin/users', {
        params: { ids: ids.join(','), limit: 100 }
      });
      const usersData = response.data?.data?.items || response.data?.data || response.data || [];
      setSelectedUsers(Array.isArray(usersData) ? usersData : []);
    } catch (error) {
      console.error('Error loading selected users:', error);
    }
  };

  // Fetch users with search and pagination
  const fetchUsers = useCallback(async (search = '', pageNum = 1, append = false) => {
    try {
      setLoading(true);
      const response = await http.get('/admin/users', {
        params: {
          search: search || undefined,
          page: pageNum,
          limit: 20
        }
      });

      const result = response.data?.data || response.data || {};
      const usersData = result.items || result || [];
      const total = result.total || 0;

      if (append) {
        setUsers(prev => [...prev, ...usersData]);
      } else {
        setUsers(usersData);
      }

      setHasMore(usersData.length > 0 && users.length + usersData.length < total);
      setPage(pageNum);
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      if (isOpen) {
        fetchUsers(searchTerm, 1, false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm, isOpen, fetchUsers]);

  // Load initial data when dropdown opens
  useEffect(() => {
    if (isOpen && users.length === 0) {
      fetchUsers('', 1, false);
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleUser = (user) => {
    if (multiple) {
      const isSelected = selectedUsers.some(u => u.id === user.id);
      let newSelected;
      
      if (isSelected) {
        newSelected = selectedUsers.filter(u => u.id !== user.id);
      } else {
        newSelected = [...selectedUsers, user];
      }
      
      setSelectedUsers(newSelected);
      onChange(newSelected.map(u => u.id));
    } else {
      setSelectedUsers([user]);
      onChange(user.id);
      setIsOpen(false);
    }
  };

  const handleRemoveUser = (userId) => {
    const newSelected = selectedUsers.filter(u => u.id !== userId);
    setSelectedUsers(newSelected);
    onChange(multiple ? newSelected.map(u => u.id) : null);
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchUsers(searchTerm, page + 1, true);
    }
  };

  const isUserSelected = (userId) => {
    return selectedUsers.some(u => u.id === userId);
  };

  const containerStyle = {
    position: 'relative',
    width: '100%'
  };

  const selectedContainerStyle = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    padding: selectedUsers.length > 0 ? '8px' : '0',
    minHeight: '44px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    backgroundColor: disabled ? '#f9fafb' : 'white',
    cursor: disabled ? 'not-allowed' : 'pointer',
    alignItems: 'center'
  };

  const tagStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 8px',
    backgroundColor: '#3b82f6',
    color: 'white',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '500'
  };

  const dropdownStyle = {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: '4px',
    backgroundColor: 'white',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    zIndex: 50,
    maxHeight,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column'
  };

  const searchBoxStyle = {
    padding: '12px',
    borderBottom: '1px solid #e5e7eb',
    position: 'relative'
  };

  const userListStyle = {
    overflowY: 'auto',
    maxHeight: 'calc(' + maxHeight + ' - 60px)'
  };

  const userItemStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 12px',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
    borderBottom: '1px solid #f3f4f6'
  };

  return (
    <div style={containerStyle} ref={dropdownRef}>
      {/* Selected Users Display */}
      <div 
        style={selectedContainerStyle}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        {selectedUsers.length === 0 ? (
          <span style={{ color: '#9ca3af', fontSize: '14px', padding: '8px' }}>
            {placeholder}
          </span>
        ) : (
          selectedUsers.map(user => (
            <div key={user.id} style={tagStyle}>
              {showAvatar && user.anh_dai_dien && (
                <img 
                  src={user.anh_dai_dien} 
                  alt=""
                  style={{ width: '20px', height: '20px', borderRadius: '50%' }}
                />
              )}
              <span>{user.ho_ten || user.email}</span>
              {!disabled && (
                <X 
                  size={14} 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveUser(user.id);
                  }}
                  style={{ cursor: 'pointer' }}
                />
              )}
            </div>
          ))
        )}
        {!disabled && (
          <ChevronDown 
            size={20} 
            style={{ 
              marginLeft: 'auto', 
              color: '#6b7280',
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s'
            }} 
          />
        )}
      </div>

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div style={dropdownStyle}>
          {/* Search Box */}
          <div style={searchBoxStyle}>
            <div style={{ position: 'relative' }}>
              <Search 
                size={18} 
                style={{
                  position: 'absolute',
                  left: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#9ca3af'
                }}
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm theo tên, email..."
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 36px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  outline: 'none'
                }}
                autoFocus
              />
            </div>
          </div>

          {/* User List */}
          <div style={userListStyle}>
            {loading && users.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
                Đang tải...
              </div>
            ) : users.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
                Không tìm thấy người dùng
              </div>
            ) : (
              <>
                {users.map(user => {
                  const selected = isUserSelected(user.id);
                  return (
                    <div
                      key={user.id}
                      style={{
                        ...userItemStyle,
                        backgroundColor: selected ? '#eff6ff' : 'transparent'
                      }}
                      onClick={() => handleToggleUser(user)}
                      onMouseEnter={(e) => {
                        if (!selected) e.currentTarget.style.backgroundColor = '#f9fafb';
                      }}
                      onMouseLeave={(e) => {
                        if (!selected) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      {/* Avatar */}
                      {showAvatar ? (
                        user.anh_dai_dien ? (
                          <img 
                            src={user.anh_dai_dien} 
                            alt=""
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              objectFit: 'cover'
                            }}
                          />
                        ) : (
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            backgroundColor: '#e5e7eb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <User size={20} color="#6b7280" />
                          </div>
                        )
                      ) : null}

                      {/* User Info */}
                      <div style={{ flex: 1 }}>
                        <div style={{ 
                          fontSize: '14px', 
                          fontWeight: '500', 
                          color: '#111827',
                          marginBottom: '2px'
                        }}>
                          {user.ho_ten || 'Chưa có tên'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>
                          {user.email}
                        </div>
                      </div>

                      {/* Checkmark */}
                      {selected && (
                        <Check size={20} color="#3b82f6" style={{ flexShrink: 0 }} />
                      )}
                    </div>
                  );
                })}

                {/* Load More */}
                {hasMore && (
                  <div
                    style={{
                      padding: '12px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      color: '#3b82f6',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                    onClick={loadMore}
                  >
                    {loading ? 'Đang tải...' : 'Tải thêm'}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserSearchSelect;
