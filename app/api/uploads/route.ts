import { NextRequest, NextResponse } from 'next/server';
import { IncomingMessage } from 'http';
import { Readable } from 'stream';
import formidable, { File } from 'formidable';
import { prisma } from '@/lib/prisma';
import fs from 'fs/promises';

// Convert Next.js Request to Node.js IncomingMessage for formidable
async function parseFormData(request: NextRequest) {
  const contentType = request.headers.get('content-type') || '';
  
  // Create a readable stream from the request body
  const reader = request.body?.getReader();
  if (!reader) {
    throw new Error('No request body');
  }

  const stream = new Readable({
    async read() {
      try {
        const { done, value } = await reader.read();
        if (done) {
          this.push(null);
        } else {
          this.push(Buffer.from(value));
        }
      } catch (error) {
        this.destroy(error as Error);
      }
    },
  });

  // Create a mock IncomingMessage for formidable
  const mockReq = Object.assign(stream, {
    headers: {
      'content-type': contentType,
    },
  }) as IncomingMessage;

  const form = formidable({
    maxFileSize: 10 * 1024 * 1024, // 10MB max file size
    allowEmptyFiles: false,
    multiples: true,
  });

  return new Promise<{ fields: formidable.Fields; files: formidable.Files }>((resolve, reject) => {
    form.parse(mockReq, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

export async function POST(request: NextRequest) {
  try {
    // TODO: Add authentication check
    // const session = await getSession();
    // if (!session) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    // Parse multipart form-data
    const { fields, files } = await parseFormData(request);

    // Extract listingId if provided
    const listingId = Array.isArray(fields.listingId) 
      ? fields.listingId[0] 
      : fields.listingId;

    // Extract userId if provided (for avatar uploads)
    const userId = Array.isArray(fields.userId)
      ? fields.userId[0]
      : fields.userId;

    // Process uploaded files
    const uploadedImages = [];
    
    // Handle both single and multiple files
    const fileArray = Array.isArray(files.file) ? files.file : files.file ? [files.file] : [];
    
    for (const file of fileArray) {
      if (!file) continue;

      const typedFile = file as File;
      
      // Read file data
      const fileData = await fs.readFile(typedFile.filepath);

      // Create image record in database
      const image = await prisma.image.create({
        data: {
          filename: typedFile.originalFilename || 'unnamed',
          mime: typedFile.mimetype || 'application/octet-stream',
          data: fileData,
          listingId: listingId as string | undefined,
          userId: userId as string | undefined,
        },
      });

      uploadedImages.push({
        id: image.id,
        filename: image.filename,
        mime: image.mime,
        size: fileData.length,
        url: `/api/images/${image.id}`,
      });

      // Clean up temporary file
      try {
        await fs.unlink(typedFile.filepath);
      } catch (error) {
        console.error('Failed to delete temp file:', error);
      }
    }

    return NextResponse.json({
      success: true,
      images: uploadedImages,
      count: uploadedImages.length,
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to upload images',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
