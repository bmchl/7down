/* eslint-disable prettier/prettier */
/* eslint-disable no-console */
import { Request, Response, Router } from 'express';
import * as nodemailer from 'nodemailer';
import { Service } from 'typedi';
import { UserService } from './../services/user.service';

@Service()
export class UserController {
    router: Router;

    constructor(private userService: UserService) {
        this.configureRouter();
    }

    private configureRouter(): void {
        this.router = Router();
        this.router.post('/', async (req: Request, res: Response) => {
            try {
                const { username, email, password } = req.body;

                const createdUser = await this.userService.createUser({
                    username,
                    email,
                    password,
                });
                res.status(201).json({
                    message: 'User created successfully',
                    user: createdUser,
                });
            } catch (error) {
                console.error(error);

                if (error.message.includes('Username already taken')) {
                    res.status(409).json({ message: error.message });
                } else {
                    res.status(500).json({ message: 'Error creating user' });
                }
            }
        });

        this.router.post('/login', async (req: Request, res: Response) => {
            try {
                const { username, password } = req.body;

                const user = await this.userService.getUserByUsername(username);

                if (user) {
                    if (user.password === password) {
                        if (user.isConnected) {
                            res.status(409).json({
                                message:
                                    'A user is already connected to this account.',
                            });
                        } else {
                            await this.userService.updateUserByUsername(
                                username,
                                { isConnected: true }
                            );
                            res.status(200).json({
                                message: 'Login successful',
                                user,
                            });
                        }
                    } else {
                        res.status(401).json({
                            message:
                                'Incorrect username or password. Please try again.',
                        });
                    }
                } else {
                    res.status(401).json({
                        message: 'User not found. Please check your username.',
                    });
                }
            } catch (error) {
                console.error(error);
                res.status(500).json({
                    message: 'Error during login. Please try again.',
                });
            }
        });

        this.router.post(
            '/:username/logoff',
            async (req: Request, res: Response) => {
                try {
                    const { username } = req.params;

                    await this.userService.updateUserByUsername(username, {
                        isConnected: false,
                    });

                    res.status(200).json({ message: 'Logoff successful' });
                } catch (error) {
                    console.error(error);
                    res.status(500).json({
                        message: 'Error during logoff. Please try again.',
                    });
                }
            }
        );
        this.router.get('/images', (req: Request, res: Response) => {
            const images = this.userService.getAllImages();
            res.json(images);
        });

        this.router.get('/', async (req: Request, res: Response) => {
            try {
                const allUsers = await this.userService.getAllUsers();
                res.json(allUsers);
            } catch (error) {
                console.error(error);
                res.status(500).json({ message: 'Error fetching users' });
            }
        });

        this.router.get('/:username', async (req: Request, res: Response) => {
            try {
                const { username } = req.params;
                const user = await this.userService.getUserByUsername(username);
                if (user) {
                    res.json(user);
                } else {
                    res.status(404).json({ message: 'User not found' });
                }
            } catch (error) {
                console.error(error);
                res.status(500).json({ message: 'Error fetching user' });
            }
        });

        this.router.delete(
            '/:username',
            async (req: Request, res: Response) => {
                try {
                    const { username } = req.params;
                    await this.userService.deleteUserByUsername(username);
                    res.status(200).json({
                        message: 'User deleted successfully',
                    });
                } catch (error) {
                    console.error(error);
                    res.status(500).json({ message: 'Error deleting user' });
                }
            }
        );

        this.router.put('/:username', async (req: Request, res: Response) => {
            try {
                const { username } = req.params;
                const { email, password } = req.body;
                await this.userService.updateUserByUsername(username, {
                    email,
                    password,
                });
                res.status(200).json({ message: 'User updated successfully' });
            } catch (error) {
                console.error(error);
                res.status(500).json({ message: 'Error updating user' });
            }
        });

        this.router.post('/send-email', async (req: Request, res: Response) => {
            try {
                const { userEmail, reportedReasons } = req.body;
                console.log('Received request to send email');
                console.log('Request body:', req.body);
                console.log('Sending email to:', userEmail);

                const emailText = `Hello,
                    We have received 3 reports regarding your behavior on our platform for the following reasons:\n
                    ${reportedReasons}\n
                    Please ensure that you adhere to our community guidelines to avoid further action being taken against your account.\n
                    If you have any questions or concerns, feel free to reach out to our support team.\n
                    Best regards, 7DOWN.\n \n
                    Bonjour,
                    Nous avons reçu 3 signalements concernant votre comportement sur notre plateforme pour les raisons suivantes :\n
                    ${reportedReasons}\n
                    Veuillez vous assurer de respecter nos directives communautaires pour éviter 
                    que d'autres mesures ne soient prises contre votre compte.\n
                    Si vous avez des questions ou des préoccupations, n'hésitez pas à contacter notre équipe d'assistance.\n
                    Cordialement, 7DOWN.
                    `;

                const transporter = nodemailer.createTransport({
                    service: 'hotmail',
                    host: 'smtp-mail.outlook.com',
                    secure: false,
                    port: 587,
                    auth: {
                        user: 'Sevendown777@hotmail.com',
                        pass: '7777Down',
                    },
                });
                const mailOptions = {
                    from: 'Sevendown777@hotmail.com',
                    to: userEmail,
                    subject:
                        'You have been reported 3 times! | Vous avez été signalé 3 fois!',
                    text: emailText,
                };

                await transporter.sendMail(mailOptions);
                res.status(200).json({ message: 'Email sent successfully' });
            } catch (error) {
                console.error('Error sending email:', error);
                res.status(500).json({ error: 'Error sending email' });
            }
        });
    }
}
