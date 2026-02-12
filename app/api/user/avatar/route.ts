import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { put, del } from '@vercel/blob';

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

    // Delete old avatar if exists
    if (user.customAvatarUrl && user.customAvatarUrl.includes('blob.vercel-storage.com')) {
      try {
        console.log('Deleting old avatar:', user.customAvatarUrl);
        await del(user.customAvatarUrl);
      } catch (error) {
        console.error('Failed to delete old avatar:', error);
        // Continue with upload even if delete fails
      }
    }

    // Generate unique filename
    const fileExtension = file.name.split('.').pop();
    const filename = `${userId}-${Date.now()}.${fileExtension}`;

    // Determine environment prefix for blob storage
    const isProduction = process.env.VERCEL_ENV === 'production';
    const envPrefix = isProduction ? 'production' : 'staging';
    const blobPath = `${envPrefix}/avatars/${filename}`;

    console.log('Uploading to Vercel Blob:', {
      path: blobPath,
      size: file.size,
      type: file.type,
      environment: envPrefix,
    });

    // Upload to Vercel Blob
    const blob = await put(blobPath, file, {
      access: 'public',
      contentType: file.type,
    });

    console.log('Blob upload successful:', blob.url);
    const avatarUrl = blob.url;

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
  } catch (error: any) {
    console.error('Avatar upload error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      cause: error.cause,
    });
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to upload avatar',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'User ID is required' },
        { status: 401 }
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

    // Delete avatar from blob storage if exists
    if (user.customAvatarUrl && user.customAvatarUrl.includes('blob.vercel-storage.com')) {
      try {
        console.log('Deleting avatar:', user.customAvatarUrl);
        await del(user.customAvatarUrl);
      } catch (error) {
        console.error('Failed to delete avatar from blob storage:', error);
        // Continue with database update even if blob delete fails
      }
    }

    // Update user to remove custom avatar
    const updatedUser = await prisma.waitlistUser.update({
      where: { id: userId },
      data: { customAvatarUrl: null },
    });

    return NextResponse.json({
      success: true,
      message: 'Avatar removed successfully',
      data: {
        avatarUrl: null,
      },
    });
  } catch (error: any) {
    console.error('Avatar removal error:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to remove avatar',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}
