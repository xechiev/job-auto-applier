export interface UserProfile {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    location: string;
    linkedinProfile?: string;

    // Резюме и навыки
    resume: {
        summary: string;
        skills: string[];
        experience: WorkExperience[];
        education: Education[];
        resumeFileUrl?: string;
    };

    // Preferences для автоподачи
    jobPreferences: {
        desiredRoles: string[];
        preferredLocations: string[];
        salaryRange: { min: number; max: number };
        workType: 'remote' | 'hybrid' | 'onsite' | 'any';
        experienceLevel: 'entry' | 'mid' | 'senior';
    };

    // Добавим в ProfileService.ts
    demographicData: {
        gender?: 'male' | 'female' | 'non-binary' | 'prefer-not-to-say';
        ethnicity?: string[];
        veteranStatus?: 'yes' | 'no' | 'prefer-not-to-say';
        disabilityStatus?: 'yes' | 'no' | 'prefer-not-to-say';
        sexualOrientation?: string[];
        transgender?: 'yes' | 'no' | 'prefer-not-to-say';
        pronouns?: string;
    };

    // Данные для форм заявок
    applicationData: {
        coverLetterTemplate: string;
        portfolioUrl?: string;
        githubUrl?: string;
        linkedinUrl?: string;
        availableStartDate: string;
        sponsorshipRequired: boolean;
    };
}

export interface WorkExperience {
    company: string;
    position: string;
    startDate: string;
    endDate: string;
    description: string;
    location: string;
}

export interface Education {
    institution: string;
    degree: string;
    field: string;
    graduationYear: string;
    gpa?: string;
}

class ProfileService {
    // Временно в памяти, потом перенесем в БД
    private profiles: Map<string, UserProfile> = new Map();

    async createProfile(
        profileData: Partial<UserProfile>
    ): Promise<UserProfile> {
        const profile: UserProfile = {
          id: `profile_${Date.now()}`,
          email: profileData.email || '',
          firstName: profileData.firstName || '',
          lastName: profileData.lastName || '',
          phone: profileData.phone || '',
          location: profileData.location || '',

          resume: {
            summary: profileData.resume?.summary || '',
            skills: profileData.resume?.skills || [],
            experience: profileData.resume?.experience || [],
            education: profileData.resume?.education || [],
          },

          jobPreferences: {
            desiredRoles: profileData.jobPreferences?.desiredRoles || [
              'Software Engineer',
            ],
            preferredLocations: profileData.jobPreferences
              ?.preferredLocations || ['Remote'],
            salaryRange: profileData.jobPreferences?.salaryRange || {
              min: 80000,
              max: 150000,
            },
            workType: profileData.jobPreferences?.workType || 'any',
            experienceLevel: profileData.jobPreferences?.experienceLevel || 'mid',
          },

          applicationData: {
            coverLetterTemplate: profileData.applicationData?.coverLetterTemplate ||
              this.getDefaultCoverLetter(),
            portfolioUrl: profileData.applicationData?.portfolioUrl || '',
            githubUrl: profileData.applicationData?.githubUrl || '',
            linkedinUrl: profileData.applicationData?.linkedinUrl || '',
            availableStartDate: profileData.applicationData?.availableStartDate ||
              '2 weeks',
            sponsorshipRequired: profileData.applicationData?.sponsorshipRequired || false,
          },
          demographicData: {
            gender: undefined,
            ethnicity: undefined,
            veteranStatus: undefined,
            disabilityStatus: undefined,
            sexualOrientation: undefined,
            transgender: undefined,
            pronouns: undefined
          }
        };

        this.profiles.set(profile.id, profile);
        return profile;
    }

    async getProfile(profileId: string): Promise<UserProfile | null> {
        return this.profiles.get(profileId) || null;
    }

    async updateProfile(
        profileId: string,
        updates: Partial<UserProfile>
    ): Promise<UserProfile | null> {
        const profile = this.profiles.get(profileId);
        if (!profile) return null;

        const updatedProfile = { ...profile, ...updates };
        this.profiles.set(profileId, updatedProfile);
        return updatedProfile;
    }

    generateCoverLetter(
        profile: UserProfile,
        jobTitle: string,
        companyName: string
    ): string {
        const template = profile.applicationData.coverLetterTemplate;

        return template
            .replace(/\{firstName\}/g, profile.firstName)
            .replace(/\{lastName\}/g, profile.lastName)
            .replace(/\{jobTitle\}/g, jobTitle)
            .replace(/\{companyName\}/g, companyName)
            .replace(/\{skills\}/g, profile.resume.skills.join(', '))
            .replace(
                /\{experience\}/g,
                profile.resume.experience.length.toString()
            );
    }

    private getDefaultCoverLetter(): string {
        return `Dear Hiring Manager,

I am writing to express my interest in the {jobTitle} position at {companyName}. With my background in {skills} and {experience} years of experience, I am confident I would be a valuable addition to your team.

In my previous roles, I have successfully delivered high-quality software solutions and collaborated effectively with cross-functional teams. I am particularly drawn to {companyName} because of your innovative approach and commitment to excellence.

I am excited about the opportunity to contribute to your team and would welcome the chance to discuss how my skills and experience align with your needs.

Best regards,
{firstName} {lastName}`;
    }
}

export default ProfileService;
