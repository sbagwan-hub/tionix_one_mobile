export const API_BASE_URL = 'http://192.168.1.5:4100';
export const API_ENDPOINTS = {
  login: '/api/mobile/auth/login',
  attendance: '/api/mobile/attendance/punch-in',
  checkout: '/api/mobile/attendance/checkout',
  history: '/api/mobile/attendance/history',
  profile: (fkEmpId: number) => `/api/mobile/attendance/employee/${fkEmpId}`,
  status: (fkEmpId: number) => `/api/mobile/attendance/status/${fkEmpId}`,
  liveLocation: '/api/mobile/attendance/live-location',
  liveLocationConfig: '/api/mobile/attendance/live-location/config',
  profileImage: '/api/mobile/attendance/profile/image',
  config: '/api/mobile/attendance/config',
  geolocations: '/api/mobile/hrm/admin/hl-geolocations',
  leaveApply: '/api/mobile/leave/apply',
  leaveHistory: '/api/mobile/leave/history',
  leaveTypes: '/api/mobile/leave/types',
};

