import { Request, Response, NextFunction } from 'express';
import { trainerUploadFields, instituteUploadFields } from './upload';

/**
 * Dynamic upload middleware that selects the appropriate upload configuration
 * based on the user role in the request body
 */
export const roleBasedUpload = (req: Request, res: Response, next: NextFunction) => {
    const role = req.body.role;

    if (role === 'TRAINER') {
        return trainerUploadFields(req, res, next);
    } else if (role === 'INSTITUTE_ADMIN') {
        return instituteUploadFields(req, res, next);
    } else {
        // No file upload needed for students or other roles
        next();
    }
};
