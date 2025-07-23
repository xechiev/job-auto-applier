import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    location?: string;

    // Резюме данные
    resume: {
        summary?: string;
        skills: string[];
        experience: Array<{
            company: string;
            position: string;
            startDate: string;
            endDate?: string;
            description: string;
            location: string;
        }>;
        education: Array<{
            institution: string;
            degree: string;
            field: string;
            graduationYear: string;
            gpa?: string;
        }>;
        resumeFileUrl?: string;
    };

    // Preferences для поиска работы
    jobPreferences: {
        desiredRoles: string[];
        preferredLocations: string[];
        salaryRange: { min: number; max: number };
        workType: 'remote' | 'hybrid' | 'onsite' | 'any';
        experienceLevel: 'entry' | 'mid' | 'senior';
    };

    // Данные для автоподачи
    applicationData: {
        coverLetterTemplate: string;
        portfolioUrl?: string;
        githubUrl?: string;
        linkedinUrl?: string;
        availableStartDate: string;
        sponsorshipRequired: boolean;
    };

    // Статистика
    stats: {
        totalApplications: number;
        successfulApplications: number;
        lastApplicationDate?: Date;
        applicationsThisWeek: number;
        applicationsThisMonth: number;
    };

    createdAt: Date;
    updatedAt: Date;
}

const UserSchema = new Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        firstName: {
            type: String,
            required: true,
            trim: true,
        },
        lastName: {
            type: String,
            required: true,
            trim: true,
        },
        phone: {
            type: String,
            trim: true,
        },
        location: {
            type: String,
            trim: true,
        },

        resume: {
            summary: {
                type: String,
                default: '',
            },
            skills: [
                {
                    type: String,
                    trim: true,
                },
            ],
            experience: [
                {
                    company: { type: String, required: true },
                    position: { type: String, required: true },
                    startDate: { type: String, required: true },
                    endDate: String,
                    description: String,
                    location: String,
                },
            ],
            education: [
                {
                    institution: { type: String, required: true },
                    degree: { type: String, required: true },
                    field: { type: String, required: true },
                    graduationYear: { type: String, required: true },
                    gpa: String,
                },
            ],
            resumeFileUrl: String,
        },

        jobPreferences: {
            desiredRoles: [{ type: String, trim: true }],
            preferredLocations: [{ type: String, trim: true }],
            salaryRange: {
                min: { type: Number, default: 50000 },
                max: { type: Number, default: 100000 },
            },
            workType: {
                type: String,
                enum: ['remote', 'hybrid', 'onsite', 'any'],
                default: 'any',
            },
            experienceLevel: {
                type: String,
                enum: ['entry', 'mid', 'senior'],
                default: 'mid',
            },
        },

        applicationData: {
            coverLetterTemplate: {
                type: String,
                default:
                    'Hi! Applied for Frontend Engineer role and decided to reach out here. I’ve built React apps for 500K+ daily users, cut load times from 4.7s to 1.8s, led teams, and designed micro-frontends and component libraries. Are you hiring?',
            },
            portfolioUrl: String,
            githubUrl: String,
            linkedinUrl: String,
            availableStartDate: {
                type: String,
                default: '2 weeks',
            },
            sponsorshipRequired: {
                type: Boolean,
                default: false,
            },
        },

        stats: {
            totalApplications: { type: Number, default: 0 },
            successfulApplications: { type: Number, default: 0 },
            lastApplicationDate: Date,
            applicationsThisWeek: { type: Number, default: 0 },
            applicationsThisMonth: { type: Number, default: 0 },
        },
    },
    {
        timestamps: true,
    }
);

// Методы для обновления статистики
UserSchema.methods.incrementApplicationStats = function () {
    this.stats.totalApplications += 1;
    this.stats.lastApplicationDate = new Date();
    // Логика подсчета weekly/monthly будет добавлена
    return this.save();
};

UserSchema.methods.incrementSuccessfulApplications = function () {
    this.stats.successfulApplications += 1;
    return this.save();
};

export default mongoose.model<IUser>('User', UserSchema);
