import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Complaint from '@/models/Complaint';
import Feedback from '@/models/Feedback';
import Category from '@/models/Category';
import { requireAuth, requireRole, AuthenticatedRequest } from '@/lib/middleware';

async function handler(req: AuthenticatedRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const dateFilter: any = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    // For staff, only show complaints assigned to them
    if (req.user!.role === 'staff') {
      dateFilter.assignedTo = req.user!.userId;
    }

    const [
      totalComplaints,
      openComplaints,
      inProgressComplaints,
      resolvedComplaints,
      closedComplaints,
      complaintsByCategory,
      complaintsByUrgency,
      complaintsByStatus,
      averageResolutionTime,
      feedbackStats,
    ] = await Promise.all([
      Complaint.countDocuments(dateFilter),
      Complaint.countDocuments({ ...dateFilter, status: 'open' }),
      Complaint.countDocuments({ ...dateFilter, status: 'in-progress' }),
      Complaint.countDocuments({ ...dateFilter, status: 'resolved' }),
      Complaint.countDocuments({ ...dateFilter, status: 'closed' }),
      Complaint.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'category' } },
        { $unwind: '$category' },
        { $project: { name: '$category.name', count: 1 } },
        { $sort: { count: -1 } },
      ]),
      Complaint.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$urgency', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Complaint.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Complaint.aggregate([
        { $match: { ...dateFilter, resolvedAt: { $exists: true } } },
        {
          $project: {
            resolutionTime: { $subtract: ['$resolvedAt', '$createdAt'] },
          },
        },
        {
          $group: {
            _id: null,
            avgTime: { $avg: '$resolutionTime' },
          },
        },
      ]),
      Feedback.aggregate([
        {
          $group: {
            _id: null,
            averageRating: { $avg: '$rating' },
            totalRatings: { $sum: 1 },
            ratings: {
              $push: '$rating',
            },
          },
        },
        {
          $project: {
            averageRating: { $round: ['$averageRating', 2] },
            totalRatings: 1,
            ratingDistribution: {
              $map: {
                input: [1, 2, 3, 4, 5],
                as: 'rating',
                in: {
                  rating: '$$rating',
                  count: {
                    $size: {
                      $filter: {
                        input: '$ratings',
                        as: 'r',
                        cond: { $eq: ['$$r', '$$rating'] },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      ]),
    ]);

    const avgResolutionHours = averageResolutionTime[0]?.avgTime
      ? Math.round(averageResolutionTime[0].avgTime / (1000 * 60 * 60))
      : 0;

    return NextResponse.json({
      overview: {
        total: totalComplaints,
        open: openComplaints,
        inProgress: inProgressComplaints,
        resolved: resolvedComplaints,
        closed: closedComplaints,
      },
      byCategory: complaintsByCategory,
      byUrgency: complaintsByUrgency,
      byStatus: complaintsByStatus,
      performance: {
        averageResolutionHours: avgResolutionHours,
        resolutionRate: totalComplaints > 0 ? ((resolvedComplaints + closedComplaints) / totalComplaints) * 100 : 0,
      },
      feedback: feedbackStats[0] || {
        averageRating: 0,
        totalRatings: 0,
        ratingDistribution: [],
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch analytics' }, { status: 500 });
  }
}

export const GET = requireRole('admin', 'management', 'staff')(handler);

