import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { put } from '@vercel/blob';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('avatar') as File;
    const userId = formData.get('userId') as string;

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'User ID is required' },
        { status: 401 }
      );
    }

    if (!file) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Avatar file is required' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Only JPEG, PNG, and WebP images are allowed' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'File size must be less than 5MB' },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.waitlistUser.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Not Found', message: 'User not found' },
        { status: 404 }
      );
    }

    // Generate unique filename
    const fileExtension = file.name.split('.').pop();
    const filename = `${userId}-${Date.now()}.${fileExtension}`;

    let avatarUrl: string;

    // Use Vercel Blob in production/staging, local storage in development
    const isProduction = process.env.VERCEL_ENV === 'production';
    const isPreview = process.env.VERCEL_ENV === 'preview';

    if (isProduction || isPreview) {
      // Determine environment prefix for blob storage
      const envPrefix = isProduction ? 'production' : 'staging';
      const blobPath = `${envPrefix}/avatars/${filename}`;

      // Upload to Vercel Blob
      const blob = await put(blobPath, file, {
        access: 'public',
        contentType: file.type,
      });

      avatarUrl = blob.url;
    } else {
      // Local development - use filesystem
      const uploadsDir = path.join(process.cwd(), 'public', 'avatars');
      if (!existsSync(uploadsDir)) {
        await mkdir(uploadsDir, { recursive: true });
      }

      const filepath = path.join(uploadsDir, filename);
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(filepath, buffer);

      avatarUrl = `/avatars/${filename}`;
    }

    // Update user with new avatar URL
    const updatedUser = await prisma.waitlistUser.update({
      where: { id: userId },
      data: { customAvatarUrl: avatarUrl },
    });

    return NextResponse.json({
      success: true,
      message: 'Avatar uploaded successfully',
      data: {
        avatarUrl: updatedUser.customAvatarUrl,
      },
    });
  } catch (error) {
    console.error('Avatar upload error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to upload avatar' },
      { status: 500 }
    );
  }
}
