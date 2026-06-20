const { Permission, Role } = require('node-appwrite');

const getOwnerPermissions = (userId) => [
  Permission.read(Role.user(userId)),
  Permission.update(Role.user(userId)),
  Permission.delete(Role.user(userId)),
];

const getPublicReadPermissions = () => [
  Permission.read(Role.any()),
];

const getAuthenticatedReadPermissions = () => [
  Permission.read(Role.users()),
];

const getJobPermissions = (employerId) => [
  Permission.read(Role.users()), // Any auth user can read
  Permission.update(Role.user(employerId)),
  Permission.delete(Role.user(employerId)),
];

const getApplicationPermissions = (applicantId, employerId) => [
  Permission.read(Role.user(applicantId)),
  Permission.read(Role.user(employerId)),
  Permission.update(Role.user(applicantId)),
  Permission.update(Role.user(employerId)), // Employer might need to update status
];

const getConversationPermissions = (employeeId, employerId) => [
  Permission.read(Role.user(employeeId)),
  Permission.read(Role.user(employerId)),
  Permission.write(Role.user(employeeId)),
  Permission.write(Role.user(employerId)),
];

const getNotificationPermissions = (userId) => [
  Permission.read(Role.user(userId)),
  Permission.update(Role.user(userId)),
];

const getAdminOnlyReadPermissions = (adminId) => [
  Permission.read(Role.user(adminId)),
];

module.exports = {
  getOwnerPermissions,
  getPublicReadPermissions,
  getAuthenticatedReadPermissions,
  getJobPermissions,
  getApplicationPermissions,
  getConversationPermissions,
  getNotificationPermissions,
  getAdminOnlyReadPermissions,
};
