import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';

const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

export const uploadsDir = process.env.UPLOADS_DIR
    ? path.resolve(process.env.UPLOADS_DIR)
    : isProduction
        ? path.resolve('/var/data/uploads')
        : path.join(process.cwd(), 'uploads');

function ensureUploadsDir() {
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
    }
}

ensureUploadsDir();

// Configure storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        ensureUploadsDir();
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename: timestamp-randomstring-originalname
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const nameWithoutExt = path.basename(file.originalname, ext);
        cb(null, `${nameWithoutExt}-${uniqueSuffix}${ext}`);
    },
});

// File filter for allowed file types
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    // Allow PDFs and images
    const allowedMimes = [
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
    ];

    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only PDF and image files are allowed.'));
    }
};

// Create multer upload instance
export const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 7 * 1024 * 1024, // 7MB limit per file
    },
});

// Multer field configurations for different roles
export const trainerUploadFields = upload.fields([
    { name: 'cv', maxCount: 1 },
    { name: 'certificates', maxCount: 5 },
]);

export const instituteUploadFields = upload.fields([
    { name: 'licenseDocument', maxCount: 1 },
]);
