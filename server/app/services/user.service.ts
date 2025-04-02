import { User } from '@common/user'; // Assuming the path to your User interface
import { Service } from 'typedi';
import { DB_CONSTS } from './../utils/env';
import { DatabaseService } from './database.service';

@Service()
export class UserService {
    constructor(public dbService: DatabaseService) {}
    get collection() {
        return this.dbService.db.collection(DB_CONSTS.DB_COLLECTION_USERS);
    }

    async getAllUsers(): Promise<User[]> {
        try {
            const users = await this.collection.find().toArray();
            return users;
        } catch (error) {
            console.error('Error fetching all users:', error);
            throw error;
        }
    }

    async getUserByUsername(username: string): Promise<User | null> {
        try {
            const user = await this.collection.findOne({ username });
            return user;
        } catch (error) {
            console.error(`Error fetching user by username "${username}":`, error);
            throw error;
        }
    }

    async createUser(user: { username: string; email: string; password: string }) {
        const exisingUser = await this.getUserByUsername(user.username);
        if (exisingUser) {
            throw new Error(`Username already taken`);
        }

        const createdUser: User = {
            username: user.username,
            email: user.email,
            password: user.password,
            isConnected: false,
        };
        await this.collection.insertOne(createdUser);

        return createdUser;
    }

    async deleteUserByUsername(username: string): Promise<void> {
        try {
            await this.collection.deleteOne({ username });
        } catch (error) {
            console.error(`Error deleting user by username "${username}":`, error);
            throw error;
        }
    }

    getAllImages(): string[] {
        // Assuming the images are stored in the assets folder
        const imageFolder = 'assets/';
        const imageNames = ['monkey1.png', 'monkey2.jpg', 'monkey3.jpg', 'monkey4.png', 'monkey5.png'];
        return imageNames.map((imageName) => imageFolder + imageName);
    }

    async updateUserByUsername(username: string, updates: { email?: string; password?: string; isConnected?: boolean }): Promise<void> {
        try {
            await this.collection.updateOne({ username }, { $set: updates });
        } catch (error) {
            console.error(`Error updating user by username "${username}":`, error);
            throw error;
        }
    }
}
