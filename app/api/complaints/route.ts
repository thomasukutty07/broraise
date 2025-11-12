import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Complaint from '@/models/Complaint';
import Category from '@/models/Category';
import { requireAuth, AuthenticatedRequest } from '@/lib/middleware';
import { z } from 'zod';
import { createAuditLog } from '@/lib/audit';
import { sendEmail, sendEmailIfEnabled, getComplaintEmailTemplate } from '@/lib/email';
import User from '@/models/User';
import Settings from '@/models/Settings';
import { emitToRole, emitToUser } from '@/lib/socket-helper';
import { saveNotificationToRole, saveNotificationToDB } from '@/lib/notification-helper';

const createComplaintSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(10),
  category: z.string(),
  urgency: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  dueDate: z.string().optional(),
  tags: z.array(z.string()).optional(),
  attachments: z.array(z.string()).optional(),
});

async function createHandler(req: AuthenticatedRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const validatedData = createComplaintSchema.parse(body);

    // Check if auto-assignment is enabled
    const settings = await Settings.findOne() || await Settings.create({});
    let assignedTo = null;

    if (settings.autoAssign) {
      // Find available staff members (staff with least assigned open complaints)
      const staffMembers = await User.find({ 
        role: 'staff', 
        isActive: true 
      });

      if (staffMembers.length > 0) {
        // Get complaint counts for each staff member
        const staffWithCounts = await Promise.all(
          staffMembers.map(async (staff) => {
            const openComplaintsCount = await Complaint.countDocuments({
              assignedTo: staff._id,
              status: { $in: ['open', 'in-progress'] },
            });
            return { staff, count: openComplaintsCount };
          })
        );

        // Sort by complaint count (ascending) and assign to staff with least complaints
        staffWithCounts.sort((a, b) => a.count - b.count);
        assignedTo = staffWithCounts[0].staff._id;
        
      }
    }

    const complaint = await Complaint.create({
      ...validatedData,
      submittedBy: req.user!.userId,
      status: 'open',
      assignedTo: assignedTo,
    });

    await createAuditLog(complaint._id.toString(), 'complaint_created', req.user!.userId);
    
    // If auto-assigned, notify the assigned staff member
    if (assignedTo) {
      const assignedStaff = await User.findById(assignedTo);
      if (assignedStaff) {
        const assignmentNotification = {
          type: 'complaint_assigned' as const,
          complaintId: complaint._id.toString(),
          title: complaint.title,
        };
        
        // Emit real-time notification
        emitToUser(assignedTo.toString(), 'complaint_assigned', assignmentNotification);
        
        // Save to database for offline users
        await saveNotificationToDB(assignedTo.toString(), assignmentNotification);
      }
    }

    const user = await User.findById(req.user!.userId);
    if (user) {
      const emailTemplate = getComplaintEmailTemplate(
        'submitted',
        complaint.title,
        complaint._id.toString()
      );
      await sendEmailIfEnabled(
        user._id.toString(),
        'newComplaint',
        user.email,
        emailTemplate.subject,
        emailTemplate.html
      );
    }

    const populatedComplaint = await Complaint.findById(complaint._id)
      .populate('category', 'name')
      .populate('submittedBy', 'name email')
      .populate('assignedTo', 'name email');

    if (!populatedComplaint) {
      return NextResponse.json({ error: 'Failed to retrieve created complaint' }, { status: 500 });
    }

    // Emit Socket.io event for new complaint IMMEDIATELY (notify admins and management)
    // This happens before the response is sent to ensure real-time delivery
    
    // Get submitter information for notification
    // Handle both populated object and ID cases
    const submittedBy = populatedComplaint.submittedBy;
    const submitterName: string = (submittedBy && typeof submittedBy === 'object' && 'name' in submittedBy) 
      ? (submittedBy.name as string)
      : (user?.name || 'Unknown');
    const submitterEmail: string = (submittedBy && typeof submittedBy === 'object' && 'email' in submittedBy)
      ? (submittedBy.email as string)
      : (user?.email || '');
    
    const notificationData = {
      type: 'new_complaint' as const,
      complaintId: complaint._id.toString(),
      title: complaint.title,
      submitterName: submitterName,
      submitterEmail: submitterEmail,
    };
    
    // Emit real-time notifications via Socket.io
    emitToRole('admin', 'new_complaint', notificationData);
    emitToRole('management', 'new_complaint', notificationData);
    
    // Save notifications to database for offline users
    await saveNotificationToRole('admin', notificationData);
    await saveNotificationToRole('management', notificationData);

    return NextResponse.json(populatedComplaint, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      // Format validation errors into user-friendly messages
      const errorMessages = error.errors.map((err) => {
        const field = err.path.join('.');
        if (err.code === 'too_small') {
          if (field === 'title') {
            return 'Title must be at least 5 characters long';
          } else if (field === 'description') {
            return 'Description must be at least 10 characters long';
          }
        } else if (err.code === 'too_big') {
          if (field === 'title') {
            return 'Title must be no more than 200 characters long';
          }
        } else if (err.code === 'invalid_type') {
          return `${field} has an invalid type`;
        } else if (err.code === 'invalid_enum_value') {
          return `${field} has an invalid value`;
        }
        return err.message || `${field} is invalid`;
      });
      
      return NextResponse.json(
        { 
          error: errorMessages.length === 1 ? errorMessages[0] : 'Validation failed',
          details: errorMessages.length > 1 ? errorMessages : undefined,
          validationErrors: error.errors 
        },
        { status: 400 }
      );
    }
    console.error('Complaint creation error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create complaint' }, { status: 500 });
  }
}

async function listHandler(req: AuthenticatedRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const urgency = searchParams.get('urgency');
    const category = searchParams.get('category');
    const assignedTo = searchParams.get('assignedTo');
    const submittedBy = searchParams.get('submittedBy');
    const search = searchParams.get('search');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const filter: any = {};

    if (req.user!.role === 'student') {
      filter.submittedBy = req.user!.userId;
    } else if (req.user!.role === 'staff') {
      // Staff see only their assigned complaints by default
      if (assignedTo === 'unassigned') {
        filter.assignedTo = null;
      } else if (assignedTo === 'all') {
        // Allow staff to see all complaints if explicitly requested
        // Don't set filter.assignedTo
      } else {
        // Default: show only complaints assigned to this staff member
        filter.assignedTo = req.user!.userId;
      }
    }

    if (status) filter.status = status;
    if (urgency) filter.urgency = urgency;
    if (category) filter.category = category;
    if (submittedBy) filter.submittedBy = submittedBy;

    // Date range filter
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) {
        filter.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = endDate;
      }
    }

    // Search functionality - search in title and description
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const complaints = await Complaint.find(filter)
      .populate('category', 'name')
      .populate('submittedBy', 'name email')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Complaint.countDocuments(filter);

    return NextResponse.json({
      complaints,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch complaints' }, { status: 500 });
  }
}

export const POST = requireAuth(createHandler);
export const GET = requireAuth(listHandler);

