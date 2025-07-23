import mongoose, { Document, Schema } from 'mongoose';

export interface IJob extends Document {
    // Основная информация
    title: string;
    company: string;
    location: string;
    description: string;
    salary?: string;

    // Метаданные
    platform: 'linkedin' | 'indeed' | 'glassdoor' | 'dice' | 'monster';
    url: string;
    jobId: string; // ID на платформе
    isEasyApply: boolean;

    // Детали поиска
    searchKeywords: string[];
    searchLocation: string;

    // Дополнительная информация
    requirements?: string[];
    benefits?: string[];
    jobType?: 'fulltime' | 'parttime' | 'contract' | 'internship';
    experienceLevel?: 'entry' | 'mid' | 'senior' | 'executive';
    remote?: boolean;

    // Временные метки
    datePosted: Date;
    dateScraped: Date;
    lastUpdated: Date;

    // Статистика
    viewCount: number;
    applicationCount: number;

    // Статус
    isActive: boolean;
    isDuplicate: boolean;
}

const JobSchema = new Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        company: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        location: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        description: {
            type: String,
            required: true,
        },
        salary: {
            type: String,
            trim: true,
        },

        platform: {
            type: String,
            enum: ['linkedin', 'indeed', 'glassdoor', 'dice', 'monster'],
            required: true,
            index: true,
        },
        url: {
            type: String,
            required: true,
            unique: true,
        },
        jobId: {
            type: String,
            required: true,
            index: true,
        },
        isEasyApply: {
            type: Boolean,
            default: false,
            index: true,
        },

        searchKeywords: [{ type: String, trim: true }],
        searchLocation: {
            type: String,
            trim: true,
            index: true,
        },

        requirements: [{ type: String, trim: true }],
        benefits: [{ type: String, trim: true }],
        jobType: {
            type: String,
            enum: ['fulltime', 'parttime', 'contract', 'internship'],
        },
        experienceLevel: {
            type: String,
            enum: ['entry', 'mid', 'senior', 'executive'],
        },
        remote: {
            type: Boolean,
            default: false,
            index: true,
        },

        datePosted: {
            type: Date,
            required: true,
            index: true,
        },
        dateScraped: {
            type: Date,
            default: Date.now,
            index: true,
        },
        lastUpdated: {
            type: Date,
            default: Date.now,
        },

        viewCount: {
            type: Number,
            default: 0,
        },
        applicationCount: {
            type: Number,
            default: 0,
        },

        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
        isDuplicate: {
            type: Boolean,
            default: false,
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

// Индексы для быстрого поиска
JobSchema.index({ title: 'text', company: 'text', description: 'text' });
JobSchema.index({ platform: 1, datePosted: -1 });
JobSchema.index({ company: 1, title: 1 });

// Методы
JobSchema.methods.incrementViews = function () {
    this.viewCount += 1;
    return this.save();
};

JobSchema.methods.incrementApplications = function () {
    this.applicationCount += 1;
    return this.save();
};

export default mongoose.model<IJob>('Job', JobSchema);
