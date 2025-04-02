/* eslint-disable max-len */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable no-console */
/* eslint-disable prettier/prettier */
import { App, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { Service } from 'typedi';

import * as admin from 'firebase-admin';

interface RoomData {
    matchId: string;
    uid: string;
    creator: boolean;
}

@Service()
export class FirebaseService {
    app: App;

    constructor() {
        // Initialize Firebase
        this.app = initializeApp({
            credential: admin.credential.cert({
                type: 'service_account',
                project_id: 'projet3-log3900-v2',
                private_key_id: '369459e105e969d788587c14bbe8ddb3d768a28f',
                private_key:
                    '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDk5E9S3T9VQcxs\nepk9lq1u89Vq/12P6y09wJOTqfFZnE+CSyoKiNAA1FlZIfZ5osgoQrltKdN6es/H\nI9sgg9xFN/k8/4vZTEJzCPmBM8xySV7jPTOr7CJF1IciKShqjBGW0ywIiecieoBQ\n6SGThCVOkLQNqVtZlCo2RgeWX860U8SMs/ijm/lYGylUHqHdgqgTFKdIuYiVxG4t\n1u8cjzxEszj2BRFO6nF3vVs1zEVo8f6xw0AzRs60EPnT8d32ZmlYu3dWFPBiWZOo\nv4zjEVXTzFPSIR+6auCHT/uX7NAMSnc5x5zNQ52VgG6qy6XBqHxHyk+joQLM6CL/\n/ef1gvfHAgMBAAECggEAOUnXfML5fgpI8wHAZwTWhcWrresabNIM8b7IcRYA3U/d\nKpxLenWBsiNz9XYlrY4LkOAabvMgBjDE3m/gAYRfVkfLLvQ6+Xk3zHj7kdX4Hsa0\nZCXGUAp7DYVDCU7J2dkS8fAKvlxdqGiGwzmGeNiDSeW32w9/WK1X31upvH5gSwuP\nGTFPMY58iMRZKIrYyf+OFqIn46wISmZoUxX9Mt7bAaFUrjlAcc/q4gd1YCfWRaJ8\nYtM8RfWx01d8Yo6ML1gIukaR/VOQJH3TRTseLZGT00DcoRCV3BN7pdjGENdHLeo4\nPPCkf+bmiLCQzDozYerG5VF9r2untUwprrcThdKuOQKBgQD4JNoTDDFkCNBTzlVs\npTK+NNXfWD7ysmC9YOEdWJIwBvKUJTLvFr5nh4k0eYJPr9uGNrZlvriobqQ4XxVT\nESI7c3+sVuSGnShmLxLq33qZzrYcSNCPk+jfCj+hP8lRYC4ObdI1KgpLu84+QjfD\nyZcHdU8PLz+39ExJ1xVI3n/wxQKBgQDsI2yUgAbOkUe2v1wYSYVtol+UHI3QVE9f\n7v52D8ZU+jdYVU8SdJim6dCupXvhMUvAlGbXWLKMUvt8LUIRyaeAH5VHXq3ap3Yh\n9N6BknlLL0Lyugk9oFx1vTud2aOsibkFsL32Vq5xVfzkSAGO+DzEtmIL7FRSLp7U\nWtLEoEV3GwKBgH0eb8sM6daLzyeCsXYPsg9QKsrr/wl2weqbb8bRQxzuU+A5BX6i\nlC01nQwVfIxbmrAI5F1XFlrvNuSppOH2kLEzYpvuUFpD4fvsHnjJaFMndJG8cVUD\n+naD/2N5+zOJ8I8b9tMRuJFJSAwCbYXOHtYG428/nrxNdS4CQlw0vIQVAoGBAOWE\n+QDN/8+//ghur0EcFQifDm+T4XNgv1XrooF2i7wFCM5e/OBfXBDAqwlV57bWh17D\n38HogINMFQx5oQJREvHBwQMBz9H7eyM+MxeWGzcs1NHAaULxH22BZPTkmeYWZzRU\nug856YxXm9r28izYs5gv/dTA/KR0lASr0rkzXtGJAoGAcPg7idPysZHbVXCkOlpQ\nb3K51lRmXqHHoFSs7htlrFdbfAMuQCkAAC5xhVVVp8cWJBZTlNk3xGsupZIzPcUd\nPIV37/g8CROqWj9A9e+cjXizx12C5niSXcJhfJY71kOVZ5MeS2yu5EUVifZLQKfq\n/rWkv1w3S7vUQ1o+0SIJUjA=\n-----END PRIVATE KEY-----\n',
                client_email: 'firebase-adminsdk-c29rm@projet3-log3900-v2.iam.gserviceaccount.com',
                client_id: '100622051052193601641',
                auth_uri: 'https://accounts.google.com/o/oauth2/auth',
                token_uri: 'https://oauth2.googleapis.com/token',
                auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
                client_x509_cert_url:
                    'https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-c29rm%40projet3-log3900-v2.iam.gserviceaccount.com',
                universe_domain: 'googleapis.com',
            } as any),
            databaseURL: 'https://projet3-log3900-v2-default-rtdb.firebaseio.com',
        });
    }

    // In FirebaseService class
    async addRoom(roomData: RoomData): Promise<void> {
        const db = getFirestore(this.app); // Corrected to use the initialized Firebase app instance
        const roomRef = db.collection('rooms').doc(roomData.matchId);
        await roomRef.set({
            uid: roomData.uid,
            creator: roomData.creator,
        });
    }

    async sendNotification(token: string, title: string, body: string) {
        const message = {
            notification: {
                title,
                body,
            },
            token,
        };

        try {
            const response = await getMessaging().send(message);
            console.log('Successfully sent message:', message);
            return response;
        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    }

    // In FirebaseService
}
