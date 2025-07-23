import mongoose, { Document, Schema } from 'mongoose';

export interface IApplication extends Document {
    // Связи
    userId: mongoose.Types.ObjectId;
    jobId: mongoose.Types.ObjectId;

    // Основная информация
    jobTitle: string;
    company: string;
    platform: string;
    jobUrl: string;

    // Данные заявки
    applicationMethod: 'easy_apply' | 'external' | 'form_fill' | 'email';
    coverLetter?: string;
    resumeUsed?: string;
    portfolioUrl?: string;

    // Кастомные ответы на вопросы
    customAnswers: Map<string, string>;

    // Статус и результат
    status:
        | 'pending'
        | 'submitted'
        | 'viewed'
        | 'interview'
        | 'rejected'
        | 'offer'
        | 'withdrawn';
    applicationResult: 'success' | 'failed' | 'skipped';
    failureReason?: string;

    // Временные метки
    appliedAt: Date;
    lastStatusUpdate: Date;
    interviewDate?: Date;

    // Отслеживание
    trackingInfo: {
        applicationId?: string; // ID на платформе
        confirmationEmail?: boolean;
        responseReceived?: boolean;
        responseDate?: Date;
    };

    // Заметки
    notes?: string;
    recruiterContact?: {
        name?: string;
        email?: string;
        phone?: string;
        linkedinUrl?: string;
    };
}

const ApplicationSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        jobId: {
            type: Schema.Types.ObjectId,
            ref: 'Job',
            required: true,
            index: true,
        },

        jobTitle: {
            type: String,
            required: true,
            trim: true,
        },
        company: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        platform: {
            type: String,
            required: true,
            index: true,
        },
        jobUrl: {
            type: String,
            required: true,
        },

        applicationMethod: {
            type: String,
            enum: ['easy_apply', 'external', 'form_fill', 'email'],
            required: true,
        },
        coverLetter: String,
        resumeUsed: String,
        portfolioUrl: String,

        customAnswers: {
            type: Map,
            of: String,
        },

        status: {
            type: String,
            enum: [
                'pending',
                'submitted',
                'viewed',
                'interview',
                'rejected',
                'offer',
                'withdrawn',
            ],
            default: 'pending',
            index: true,
        },
        applicationResult: {
            type: String,
            enum: ['success', 'failed', 'skipped'],
            required: true,
            index: true,
        },
        failureReason: String,

        appliedAt: {
            type: Date,
            default: Date.now,
            index: true,
        },
        lastStatusUpdate: {
            type: Date,
            default: Date.now,
        },
        interviewDate: Date,

        trackingInfo: {
            applicationId: String,
            confirmationEmail: { type: Boolean, default: false },
            responseReceived: { type: Boolean, default: false },
            responseDate: Date,
        },

        notes: String,
        recruiterContact: {
            name: String,
            email: String,
            phone: String,
            linkedinUrl: String,
        },
    },
    {
        timestamps: true,
    }
);

// Индексы для аналитики
ApplicationSchema.index({ userId: 1, appliedAt: -1 });
ApplicationSchema.index({ company: 1, appliedAt: -1 });
ApplicationSchema.index({ status: 1, appliedAt: -1 });
ApplicationSchema.index({ platform: 1, applicationResult: 1 });

// Методы
ApplicationSchema.methods.updateStatus = function (
    newStatus: string,
    notes?: string
) {
    this.status = newStatus;
    this.lastStatusUpdate = new Date();
    if (notes) this.notes = notes;
    return this.save();
};

ApplicationSchema.statics.getApplicationStats = function (
    userId: mongoose.Types.ObjectId
) {
    return this.aggregate([
        { $match: { userId } },
        {
            $group: {
                _id: '$applicationResult',
                count: { $sum: 1 },
            },
        },
    ]);
};

export default mongoose.model<IApplication>('Application', ApplicationSchema);
