// Import all models to ensure they are registered with Mongoose
import User from './User';
import Category from './Category';
import Complaint from './Complaint';
import Comment from './Comment';
import Feedback from './Feedback';
import AuditLog from './AuditLog';
import Settings from './Settings';
import Notification from './Notification';

// Export all models
export { default as User } from './User';
export { default as Category } from './Category';
export { default as Complaint } from './Complaint';
export { default as Comment } from './Comment';
export { default as Feedback } from './Feedback';
export { default as AuditLog } from './AuditLog';
export { default as Settings } from './Settings';
export { default as Notification } from './Notification';
export { default as ComplaintTemplate } from './ComplaintTemplate';
export { default as Reminder } from './Reminder';

