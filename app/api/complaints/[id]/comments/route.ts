import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Comment from '@/models/Comment';
import Complaint from '@/models/Complaint';
import { requireAuth, AuthenticatedRequest } from '@/lib/middleware';
import { z } from 'zod';
import { sendEmail, sendEmailIfEnabled, getComplaintEmailTemplate } from '@/lib/email';
import User from '@/models/User';
import { emitToUser, emitToRole } from '@/lib/socket-helper';
import { saveNotificationToDB, saveNotificationToRole, saveNotificationToUsers } from '@/lib/notification-helper';

const createCommentSchema = z.object({
  content: z.string().min(1),
  isInternal: z.boolean().optional(),
});

async function createHandler(req: AuthenticatedRequest, context?: { params?: Promise<{ id: string }> | { id: string } }) {
  try {
    await connectDB();
    const params = context?.params ? (await Promise.resolve(context.params)) : { id: '' };
    if (!params.id) {
      return NextResponse.json({ error: 'Complaint ID is required' }, { status: 400 });
    }

    const complaint = await Complaint.findById(params.id);
    if (!complaint) {
      return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
    }

    // Disable comments for staff
    if (req.user!.role === 'staff') {
      return NextResponse.json({ error: 'Staff members cannot add comments' }, { status: 403 });
    }

    if (req.user!.role === 'student' && complaint.submittedBy.toString() !== req.user!.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const validatedData = createCommentSchema.parse(body);

    if (validatedData.isInternal && req.user!.role === 'student') {
      return NextResponse.json({ error: 'Students cannot create internal comments' }, { status: 403 });
    }

    // Check for duplicate comments from the same user within the last 5 seconds
    // This prevents accidental double-submission
    const fiveSecondsAgo = new Date(Date.now() - 5 * 1000);
    const duplicateComment = await Comment.findOne({
      complaint: params.id,
      author: req.user!.userId,
      content: validatedData.content.trim(),
      isInternal: validatedData.isInternal || false,
      createdAt: { $gte: fiveSecondsAgo },
    });

    if (duplicateComment) {
      console.log('⚠️ Duplicate comment detected, returning existing comment');
      const existingComment = await Comment.findById(duplicateComment._id)
        .populate('author', 'name email avatar role');
      return NextResponse.json(existingComment, { status: 200 });
    }

    const comment = await Comment.create({
      complaint: params.id,
      author: req.user!.userId,
      content: validatedData.content.trim(),
      isInternal: validatedData.isInternal || false,
    });

    const populatedComment = await Comment.findById(comment._id)
      .populate('author', 'name email avatar role');

    if (!populatedComment) {
      return NextResponse.json({ error: 'Failed to retrieve created comment' }, { status: 500 });
    }

    if (!validatedData.isInternal) {
      const submittedByUser = await User.findById(complaint.submittedBy);
      const commenterUser = await User.findById(req.user!.userId);

      if (!commenterUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      if (submittedByUser && commenterUser._id.toString() !== submittedByUser._id.toString()) {
        const emailTemplate = getComplaintEmailTemplate(
          'updated',
          complaint.title,
          params.id,
          `New comment from ${commenterUser.name}`
        );
        await sendEmailIfEnabled(
          submittedByUser._id.toString(),
          'comment',
          submittedByUser.email,
          emailTemplate.subject,
          emailTemplate.html
        );
      }

      if (complaint.assignedTo && complaint.assignedTo.toString() !== req.user!.userId) {
        const assignedUser = await User.findById(complaint.assignedTo);
        if (assignedUser) {
          const emailTemplate = getComplaintEmailTemplate(
            'updated',
            complaint.title,
            params.id,
            `New comment from ${commenterUser.name}`
          );
          await sendEmailIfEnabled(
            assignedUser._id.toString(),
            'comment',
            assignedUser.email,
            emailTemplate.subject,
            emailTemplate.html
          );
          
          // Emit Socket.io event for new comment (only if assigned user is a student)
          // Staff don't receive comment notifications
          if (assignedUser.role === 'student') {
            emitToUser(assignedUser._id.toString(), 'new_comment', {
              type: 'new_comment',
              complaintId: params.id,
              title: complaint.title,
              message: validatedData.content,
              commenterName: commenterUser.name,
            });
          }
        }
      }

      // Prepare notification data
      const commentNotificationData = {
        type: 'new_comment' as const,
        complaintId: params.id,
        title: complaint.title,
        message: validatedData.content,
        commenterName: commenterUser.name,
        commenterId: commenterUser._id.toString(),
        submitterName: submittedByUser?.name,
      };

      // Emit Socket.io event to submitter if commenter is not the submitter
      if (submittedByUser && commenterUser._id.toString() !== submittedByUser._id.toString()) {
        // Ensure we use the exact same format as the JWT (string)
        const submitterUserId = String(submittedByUser._id);
        // Emit to the student who submitted the complaint
        const submitterNotificationData = {
          type: 'new_comment' as const,
          complaintId: params.id,
          title: complaint.title,
          message: validatedData.content,
          commenterName: commenterUser.name,
          commenterId: commenterUser._id.toString(), // Include commenterId for filtering
        };
        
        // Emit real-time notification
        emitToUser(submitterUserId, 'new_comment', submitterNotificationData);
        
        // Save to database for offline users
        await saveNotificationToDB(submitterUserId, submitterNotificationData);
      } else {
      }

      // Emit Socket.io event to admins for new comments
      // BUT: Don't notify the commenter about their own comment
      // Only notify other admins (not the one who made the comment)
      // We'll emit to all admins, but the client-side handler will filter out the commenter
      
      // Save notifications to database for all admins (excluding the commenter)
      // Filter out the commenter on the server side to avoid storing unnecessary notifications
      if (commenterUser.role === 'admin') {
        const adminUsers = await User.find({ role: 'admin', isActive: true }).select('_id');
        const adminIds = adminUsers
          .filter((admin) => admin._id.toString() !== commenterUser._id.toString())
          .map((admin) => admin._id.toString());
        
        if (adminIds.length > 0) {
          // Emit to each admin individually to ensure they receive the notification
          // This ensures reliable delivery compared to emitToRole
          adminIds.forEach((adminId) => {
            emitToUser(adminId, 'new_comment', {
              ...commentNotificationData,
              commenterId: commenterUser._id.toString(), // Ensure commenterId is included
            });
          });
          await saveNotificationToUsers(adminIds, commentNotificationData);
        }
      } else {
        // If commenter is not an admin, notify all admins
        // Emit to role AND save to database
        // Ensure commenterId is included in the notification data
        const adminNotificationData = {
          ...commentNotificationData,
          commenterId: commenterUser._id.toString(),
        };
        emitToRole('admin', 'new_comment', adminNotificationData);
        await saveNotificationToRole('admin', commentNotificationData);
      }
      
      // Also notify management role if they exist
      const managementNotificationData = {
        ...commentNotificationData,
        commenterId: commenterUser._id.toString(),
      };
      emitToRole('management', 'new_comment', managementNotificationData);
      await saveNotificationToRole('management', managementNotificationData);
    }

    return NextResponse.json(populatedComment, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'Failed to create comment' }, { status: 500 });
  }
}

async function listHandler(req: AuthenticatedRequest, context?: { params?: Promise<{ id: string }> | { id: string } }) {
  try {
    await connectDB();
    const params = context?.params ? (await Promise.resolve(context.params)) : { id: '' };
    if (!params.id) {
      return NextResponse.json({ error: 'Complaint ID is required' }, { status: 400 });
    }

    const complaint = await Complaint.findById(params.id);
    if (!complaint) {
      return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
    }

    if (req.user!.role === 'student' && complaint.submittedBy.toString() !== req.user!.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const filter: any = { complaint: params.id };
    if (req.user!.role === 'student') {
      filter.isInternal = false;
    }

    const comments = await Comment.find(filter)
      .populate('author', 'name email avatar role')
      .sort({ createdAt: 1 });

    return NextResponse.json(comments);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch comments' }, { status: 500 });
  }
}

export const POST = requireAuth(createHandler);
export const GET = requireAuth(listHandler);

