import prisma from '../config/database';
import { AuditAction } from '@prisma/client';

export class AuditService {
    /**
     * Log an action to the audit logs table.
     * @param data Object containing audit log details
     */
    async logAction(data: {
        action: AuditAction;
        entityName: string;
        entityId: string;
        description?: string;
        performedBy?: string; // userId
    }) {
        try {
            await prisma.auditLog.create({
                data: {
                    action: data.action,
                    entityName: data.entityName,
                    entityId: data.entityId,
                    description: data.description,
                    performedBy: data.performedBy,
                },
            });
        } catch (error) {
            console.error('[AuditService] Failed to create audit log:', error);
            // We usually don't want audit logging failures to break the main transaction,
            // so we just log the error to the console.
        }
    }
}

export const auditService = new AuditService();
