/* eslint-disable prettier/prettier */
import { CreateGame, Game, TopPlayer } from '@common/game';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { Service } from 'typedi';
import { DB_CONSTS } from './../utils/env';
import { DatabaseService } from './database.service';
import { DiffService } from './diff.service';

interface ValidateCoordsParams {
    differences: number[][][];
    x: number;
    y: number;
    found: number[];
}

interface Player {
    id: string;
    uid: string;
    name: string;
    profilePic: string;
    found: number;
    creator: boolean;
    // Add the new optional property to track deletion requests
    requestedDeletion?: boolean;
}

@Service()
export class GamesService {
    constructor(public dbService: DatabaseService, public diffService: DiffService) {}

    get collection() {
        return this.dbService.db.collection(DB_CONSTS.DB_COLLECTION_GAMES);
    }

    async getAllGames(withImageDiff: boolean = false) {
        try {
            const games = await this.collection.find({}, withImageDiff ? {} : { projection: { imageDifference: 0, _id: 0 } }).toArray();
            return games;
        } catch (err) {
            return [];
        }
    }

    async getGameById(id: unknown) {
        const game = await this.collection.findOne({ id });
        return game;
    }

    async createGame(gameInfo: CreateGame) {
        const id = randomUUID();

        const imageDifference = await this.diffService.findDifferences(gameInfo.image, gameInfo.image1, gameInfo.radius);
        if (imageDifference.length < 3 || imageDifference.length > 9) return undefined;
        const isImageSaved = await this.diffService.saveImages([gameInfo.image, gameInfo.image1], id);
        if (!isImageSaved) {
            return undefined;
        }

        let totalDifferences = 0;
        imageDifference.forEach((group) => (totalDifferences += group.length));
        let difficulty = 0;

        if (totalDifferences <= 640 * 480 * 0.15 && imageDifference.length >= 7) difficulty = 10;

        const game: Game = {
            id,
            gameName: gameInfo.gameName,
            image: `/assets/${id}-0.bmp`,
            image1: `/assets/${id}-1.bmp`,
            imageDifference,
            difficulty,
            differenceCount: imageDifference.length,
            penalty: 5,
            soloLeaderboard: [
                { playerName: 'Lorem', recordTime: 213 },
                { playerName: 'Ipsum', recordTime: 581 },
                { playerName: 'Dolor', recordTime: 609 },
            ],
            multiLeaderboard: [
                { playerName: 'Lorem', recordTime: 213 },
                { playerName: 'Ipsum', recordTime: 581 },
                { playerName: 'Dolor', recordTime: 609 },
            ],
            creationDate: new Date().toISOString(),
            creator: 'N/A',
        };
        await this.collection.insertOne(game);

        return game;
    }

    async deleteGame(id: string) {
        const res = await this.collection.findOneAndDelete({ id });
        if (res.value) {
            const currentDir: string = __dirname;
            const dirSegments: string[] = currentDir.split(path.sep);
            const newDirSegments: string[] = dirSegments.slice(0, -4);
            const serverPath: string = newDirSegments.join(path.sep);
            if (fs.existsSync(path.join(serverPath, `/assets/${id}-0.bmp`))) fs.unlinkSync(path.join(serverPath, `/assets/${id}-0.bmp`));
            if (fs.existsSync(path.join(serverPath, `/assets/${id}-1.bmp`))) fs.unlinkSync(path.join(serverPath, `/assets/${id}-1.bmp`));
        }
        return res.value !== null;
    }

    async deleteHistory() {
        const result = await this.dbService.db.collection(DB_CONSTS.DB_COLLECTION_MATCHES).deleteMany({});
        return result.deletedCount;
    }

    async updateGame(id: string, updateAttribute: any) {
        const game = await this.collection.findOne({ id });
        if (game) {
            const updatedGame = { ...game, ...updateAttribute };
            // game.isGameOn = updateAttribute.isGameOn;
            return await this.collection.findOneAndReplace({ id }, updatedGame /* game*/);
        } else {
            return false;
        }
    }

    async updateLeaderboard(matchId: string, completionTime: number) {
        const match = await this.dbService.db.collection(DB_CONSTS.DB_COLLECTION_MATCHES).findOne({ id: matchId });
        const gameId = match.gameId;
        const multiplayer = match.player1 === 'N/A' ? false : true;
        const newLeaderboard = multiplayer
            ? (await this.collection.findOne({ id: gameId }, { projection: { multiLeaderboard: 1, _id: 0 } })).multiLeaderboard
            : (await this.collection.findOne({ id: gameId }, { projection: { soloLeaderboard: 1, _id: 0 } })).soloLeaderboard;
        const newEntry: TopPlayer = {
            playerName: match.winner,
            recordTime: Math.floor(completionTime / 1000),
        };
        let alreadyExists = false;
        newLeaderboard.forEach((entry: TopPlayer) => {
            if (newEntry.recordTime === entry.recordTime) alreadyExists = true;
        });
        if (!alreadyExists) {
            newLeaderboard.push(newEntry);
            newLeaderboard.sort((a: TopPlayer, b: TopPlayer) => {
                return a.recordTime - b.recordTime;
            });
            newLeaderboard.pop();
        }
        if (newLeaderboard.indexOf(newEntry) !== -1) {
            const game = await this.collection.findOne({ id: gameId });
            if (multiplayer) {
                game.multiLeaderboard = newLeaderboard;
            } else {
                game.soloLeaderboard = newLeaderboard;
            }
            await this.collection.findOneAndReplace({ id: gameId }, game);
            return newLeaderboard.indexOf(newEntry) + 1;
        } else {
            return false;
        }
    }

    async validateCoords({ differences, x, y, found }: ValidateCoordsParams) {
        const filtered = differences.filter((el: number[][], i: number) => !found.includes(i));
        // @ts-ignore
        const index = differences.indexOf(
            // @ts-ignore
            filtered.find((group: number[][]) => group && group.find((el) => el[0] === x && el[1] === y)),
        );
        return index;
    }

    async updateConsts(initialTime: number, penalty: number, timeGainPerDiff: number) {
        return this.dbService.db.collection(DB_CONSTS.DB_COLLECTION_SETTINGS).updateOne({}, { $set: { initialTime, penalty, timeGainPerDiff } });
    }

    async getConsts() {
        return this.dbService.db.collection(DB_CONSTS.DB_COLLECTION_SETTINGS).findOne({}, { penalty: 1 });
    }

    async getHistory(uid: string) {
        console.log('uid', uid);
        // eslint-disable-next-line @typescript-eslint/naming-convention
        const match = await this.dbService.db
            .collection(DB_CONSTS.DB_COLLECTION_MATCHES)
            .find({ 'players.uid': uid }, { projection: { games: 0 } })
            .toArray();
        return match;
    }

    async removePlayerHistory(uid: string): Promise<any> {
        const playerQuery = { ['players.uid']: uid };
        const idQueryKey = '_id';
        const matchesCursor = await this.dbService.db.collection(DB_CONSTS.DB_COLLECTION_MATCHES).find(playerQuery);

        const matches = await matchesCursor.toArray();

        for (const match of matches) {
            let allRequestedDeletion = true;

            // Map over players to update their requestedDeletion status
            const updatedPlayers = match.players.map((player: Player) => {
                if (player.uid === uid) {
                    // Set requestedDeletion for the requesting player if not already set
                    if (!player.requestedDeletion) {
                        player.requestedDeletion = true;
                    }
                } else if (!player.requestedDeletion) {
                    // If any other player has not requested deletion, mark as false
                    allRequestedDeletion = false;
                }
                return player;
            });

            // Update the match record with the new player info
            await this.dbService.db
                .collection(DB_CONSTS.DB_COLLECTION_MATCHES)
                .updateOne({ [idQueryKey]: match[idQueryKey] }, { $set: { players: updatedPlayers } });

            // If all players have requested deletion, delete the record
            if (allRequestedDeletion) {
                await this.dbService.db.collection(DB_CONSTS.DB_COLLECTION_MATCHES).deleteOne({ [idQueryKey]: match[idQueryKey] });
            }
        }

        // Return some status message or result
        return { message: "Player's deletion request processed." };
    }
}
