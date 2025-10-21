import http from './http';

const classService = {
  // Get students in class
  getClassStudents: async () => {
    try {
      const response = await http.get('/class/students');
      return response.data;
    } catch (error) {
      console.error('Error getting class students:', error);
      throw error;
    }
  },

  // Get pending registrations
  getPendingRegistrations: async () => {
    try {
      const response = await http.get('/class/registrations', { params: { status: 'cho_duyet' } });
      return response.data;
    } catch (error) {
      console.error('Error getting pending registrations:', error);
      throw error;
    }
  },

  // Approve registration
  approveRegistration: async (registrationId) => {
    try {
      const response = await http.post(`/class/registrations/${registrationId}/approve`);
      return response.data;
    } catch (error) {
      console.error('Error approving registration:', error);
      throw error;
    }
  },

  // Reject registration
  rejectRegistration: async (registrationId, reason) => {
    try {
      const response = await http.post(`/class/registrations/${registrationId}/reject`, { reason });
      return response.data;
    } catch (error) {
      console.error('Error rejecting registration:', error);
      throw error;
    }
  },

  // Get class reports
  getClassReports: async (timeRange = 'semester') => {
    try {
      const response = await http.get(`/class/reports?timeRange=${timeRange}`);
      return response.data;
    } catch (error) {
      console.error('Error getting class reports:', error);
      throw error;
    }
  },

  // For activities - reuse existing activities API
  getActivities: async () => {
    try {
      const response = await http.get('/activities');
      return response.data;
    } catch (error) {
      console.error('Error getting activities:', error);
      throw error;
    }
  },

  // Create activity (if monitor has permission)
  createActivity: async (activityData) => {
    try {
      const response = await http.post('/activities', activityData);
      return response.data;
    } catch (error) {
      console.error('Error creating activity:', error);
      throw error;
    }
  },

  // Update activity
  updateActivity: async (id, activityData) => {
    try {
      const response = await http.put(`/activities/${id}`, activityData);
      return response.data;
    } catch (error) {
      console.error('Error updating activity:', error);
      throw error;
    }
  },

  // Delete activity
  deleteActivity: async (id) => {
    try {
      const response = await http.delete(`/activities/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting activity:', error);
      throw error;
    }
  }
};

export default classService;