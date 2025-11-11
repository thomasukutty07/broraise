import AuditLog from '@/models/AuditLog';
import connectDB from './db';

export async function createAuditLog(
  complaintId: string,
  action: string,
  performedBy: string,
  oldValue?: any,
  newValue?: any,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    await connectDB();
    await AuditLog.create({
      complaint: complaintId,
      action,
      performedBy,
      oldValue,
      newValue,
      metadata,
    });
  } catch (error) {
    console.error('Audit log creation error:', error);
  }
}

