import { NextRequest, NextResponse } from 'next/server';
import { manipulateRawQueryWithGroupBy } from '@/utils/queryUtils';

export async function POST(req: NextRequest) {
  try {
    const { query, dateBy, additionalGroupBy } = await req.json();
    if (!query || !dateBy) {
      return NextResponse.json({ error: 'Missing query or dateBy' }, { status: 400 });
    }
    // Use additionalGroupBy if provided; otherwise, it will be undefined.
    const updatedQuery = manipulateRawQueryWithGroupBy(query, dateBy, additionalGroupBy);
    return NextResponse.json({ updatedQuery });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
