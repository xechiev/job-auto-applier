import mongoose from 'mongoose';

const connectDB = async (): Promise<void> => {
    try {
        const mongoURI =
            process.env.MONGODB_URI ||
            'mongodb://localhost:27017/job-auto-applier';

        await mongoose.connect(mongoURI);

        console.log('✅ MongoDB подключена успешно');
    } catch (error) {
        console.error('❌ Ошибка подключения к MongoDB:', (error as Error).message);
        console.log('🔄 Продолжаем работу без БД (in-memory режим)');
        // НЕ завершаем процесс - работаем без БД
    }
};

export default connectDB;
