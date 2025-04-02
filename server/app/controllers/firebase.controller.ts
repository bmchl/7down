/* eslint-disable prettier/prettier */
/* eslint-disable no-restricted-imports */
import { Request, Response, Router } from 'express';
import { Service } from 'typedi';
import { FirebaseService } from '../services/firebase.service';

@Service()
export class FirebaseController {
    router: Router;

    constructor(private firebaseService: FirebaseService) {
        this.configureRouter();
    }

    private configureRouter(): void {
        this.router = Router();
        this.router.post('/send', async (req: Request, res: Response) => {
            try {
                const { to, notification } = req.body;

                // Parse the notification string into a JSON object
                const notificationObj = JSON.parse(notification);

                console.log('to:', to);
                console.log('notification:', notificationObj);
                console.log('notification title:', notificationObj.title);
                console.log('notification body:', notificationObj.body);

                await this.firebaseService.sendNotification(
                    to,
                    notificationObj.title ?? 'Notification',
                    notificationObj.body ?? 'This is a notification'
                );

                res.status(200).json({
                    message: 'Notification sent successfully',
                });
            } catch (error) {
                console.error(error);
                res.status(500).json({ message: 'Error sending notification' });
            }
        });
    }

    
}


