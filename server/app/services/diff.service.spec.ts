/* eslint-disable max-len */
import { expect } from 'chai';
import * as fs from 'fs';
import { DiffService } from './diff.service';

describe('DiffService', () => {
    let diffService: DiffService;
    const ogImg =
        'data:image/png;base64,Qk2GAAAAAAAAADYAAAAoAAAABQAAAPv///8BABgAAAAAAFAAAAAAAAAAAAAAAAAAAAAAAAAA////////////////////AP///////////////////wD///////////////////8A////////////////////AP///////////////////wA=';
    const modImg =
        'data:image/png;base64,Qk2GAAAAAAAAADYAAAAoAAAABQAAAPv///8BABgAAAAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA////////AAAAAAAAAP///////////wD///////8AAAAAAAD///8A////AAAAAAAAAAAAAAAAAP///wAAAAAAAAAAAAAAAAA=';

    beforeEach(async () => {
        diffService = new DiffService();
    });

    it('should convert base64 encoded string to a Buffer object', () => {
        const base64 =
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==';
        const buffer = diffService.base64ToBuffer(base64);

        expect(buffer instanceof Buffer).to.equal(true);
        expect(buffer.toString('hex')).to.equal(
            '89504e470d0a1a0a0000000d49484452000000050000000508060000008d6f26e50000001c4944415408d763f8ffff3fc37f062005c3201284d031f18258cd04000ef535cbd18e0e1f0000000049454e44ae426082',
        );
    });

    it('should save all images and return true', async () => {
        const imgs = [ogImg, modImg];
        const id = 'test';

        const result = await diffService.saveImages(imgs, id);
        expect(result).to.equal(true);

        for (let i = 0; i < imgs.length; i++) {
            const fileExists = fs.existsSync(`./assets/${id}-${i}.bmp`);
            expect(fileExists).to.equal(true);
            fs.unlinkSync(`./assets/${id}-${i}.bmp`);
        }
    });

    it('should return false if any image fails to save', async () => {
        const imgs = ['invalid data', 'other invalid data'];
        const id = 'test';

        const result = await diffService.saveImages(imgs, id);
        expect(result).to.equal(false);
    });

    it('should correctly fill a component of different values in a 2D matrix', () => {
        const differences = [
            [true, true, false, false],
            [false, true, true, false],
            [false, false, false, true],
            [true, false, true, true],
        ];
        const visited = Array(differences.length)
            .fill(null)
            .map(() => Array(differences[0].length).fill(false));
        const component: number[][] = [];
        const width = differences.length;
        const height = differences[0].length;

        diffService.floodFill({ x: 0, y: 0, differences, visited, component, width, height });

        expect(component).to.deep.equal([
            [0, 0],
            [0, 1],
            [1, 1],
            [1, 2],
        ]);
    });

    it('should return an empty array for two identical images', async () => {
        const img1Path = ogImg;
        const img2Path = ogImg;
        const enlargementRadius = 0;
        const result = await diffService.findDifferences(img1Path, img2Path, enlargementRadius);
        expect(result).to.deep.equal([]);
    });
    it('should return correct differences between two images for no given enlargement radius', async () => {
        const img1Path = ogImg;
        const img2Path = modImg;
        const expected = [
            [
                [0, 0],
                [1, 0],
                [2, 0],
                [1, 1],
                [0, 1],
            ],
            [
                [1, 3],
                [2, 3],
                [3, 3],
                [4, 3],
                [4, 4],
                [3, 4],
                [2, 4],
                [1, 4],
                [3, 2],
                [2, 2],
            ],
        ];
        const result = await diffService.findDifferences(img1Path, img2Path);
        expect(result).to.deep.equal(expected);
    });
    it('should return correct differences between two images for a given enlargement radius', async () => {
        const img1Path = ogImg;
        const img2Path = modImg;
        const expected = [
            [
                [0, 0],
                [1, 0],
                [2, 0],
                [3, 0],
                [4, 0],
                [4, 1],
                [3, 1],
                [2, 1],
                [1, 1],
                [0, 1],
                [0, 2],
                [1, 2],
                [2, 2],
                [3, 2],
                [4, 2],
                [4, 3],
                [3, 3],
                [2, 3],
                [1, 3],
                [0, 3],
                [0, 4],
                [1, 4],
                [2, 4],
                [3, 4],
                [4, 4],
            ],
        ];
        const enlargementRadius = 3;
        const result = await diffService.findDifferences(img1Path, img2Path, enlargementRadius);
        expect(result).to.deep.equal(expected);
    });
});
