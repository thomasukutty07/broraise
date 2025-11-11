import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Complaint, { IComplaint } from '@/models/Complaint';
import { requireAuth, AuthenticatedRequest } from '@/lib/middleware';
import { z } from 'zod';

const findDuplicatesSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  submittedBy: z.string().optional(),
});

async function postHandler(req: AuthenticatedRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { title, description, submittedBy } = findDuplicatesSchema.parse(body);

    // Find similar complaints based on title similarity
    const allComplaints: IComplaint[] = await Complaint.find({
      submittedBy: submittedBy || { $exists: true },
    })
      .populate('submittedBy', 'name email')
      .select('title description status createdAt submittedBy')
      .sort({ createdAt: -1 })
      .limit(100);

    // Simple similarity check - find complaints with similar titles
    const titleWords = title.toLowerCase().split(/\s+/);
    const duplicates = allComplaints
      .map((complaint: IComplaint) => {
        const complaintTitle = complaint.title.toLowerCase();
        const matchingWords = titleWords.filter((word) => complaintTitle.includes(word));
        const similarity = matchingWords.length / Math.max(titleWords.length, complaintTitle.split(/\s+/).length);
        
        return {
          complaint,
          similarity,
        };
      })
      .filter((item) => item.similarity > 0.5 && item.complaint.title.toLowerCase() !== title.toLowerCase())
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5)
      .map((item) => ({
        id: item.complaint._id.toString(),
        title: item.complaint.title,
        description: item.complaint.description,
        status: item.complaint.status,
        createdAt: item.complaint.createdAt,
        submittedBy: item.complaint.submittedBy,
        similarity: Math.round(item.similarity * 100),
      }));

    return NextResponse.json({ duplicates });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'Failed to find duplicates' }, { status: 500 });
  }
}

export const POST = requireAuth(postHandler);

