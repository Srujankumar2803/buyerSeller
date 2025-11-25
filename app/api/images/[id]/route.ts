import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch image from database
    const image = await prisma.image.findUnique({
      where: { id },
      select: {
        data: true,
        mime: true,
        filename: true,
      },
    });

    if (!image) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      );
    }

    // Return image with appropriate content-type
    return new NextResponse(image.data, {
      status: 200,
      headers: {
        'Content-Type': image.mime,
        'Content-Disposition': `inline; filename="${image.filename}"`,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });

  } catch (error) {
    console.error('Image fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch image' },
      { status: 500 }
    );
  }
}
