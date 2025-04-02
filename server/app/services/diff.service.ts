import Jimp from 'jimp/es';
import { Service } from 'typedi';

interface FloodFillParams {
    x: number;
    y: number;
    differences: boolean[][];
    visited: boolean[][];
    component: number[][];
    width: number;
    height: number;
}

@Service()
export class DiffService {
    base64ToBuffer(base64: string): Buffer {
        return Buffer.from(base64.replace('data:image/png;base64,', ''), 'base64');
    }

    async saveImages(imgs: string[], id: string): Promise<boolean> {
        try {
            for (let i = 0; i < imgs.length; i++) {
                const jimpImg = await Jimp.read(this.base64ToBuffer(imgs[i]));
                await jimpImg.writeAsync(`./assets/${id}-${i}.bmp`);
            }
            return true;
        } catch (err) {
            return false;
        }
    }

    // eslint-disable-next-line complexity
    async findDifferences(img1Path: string, img2Path: string, enlargementRadius = 0): Promise<number[][][]> {
        const img1 = await Jimp.read(this.base64ToBuffer(img1Path));
        const img2 = await Jimp.read(this.base64ToBuffer(img2Path));

        const width = img1.bitmap.width;
        const height = img1.bitmap.height;

        const differences: boolean[][] = [];
        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                let rDiff = 0;
                let gDiff = 0;
                let bDiff = 0;
                const color1 = Jimp.intToRGBA(img1.getPixelColor(x, y));
                const color2 = Jimp.intToRGBA(img2.getPixelColor(x, y));
                rDiff += Math.abs(color1.r - color2.r);
                gDiff += Math.abs(color1.g - color2.g);
                bDiff += Math.abs(color1.b - color2.b);
                differences[x] = differences[x] || [];
                differences[x][y] = rDiff !== 0 || gDiff !== 0 || bDiff !== 0;

                if (differences[x][y]) {
                    for (let dx = -enlargementRadius; dx < enlargementRadius; dx++) {
                        for (let dy = -enlargementRadius; dy < enlargementRadius; dy++) {
                            if (this.isRightCoords(x, dx, width) && this.isRightCoords(y, dy, height)) {
                                differences[x + dx] = differences[x + dx] || [];
                                differences[x + dx][y + dy] = true;
                            }
                        }
                    }
                }
            }
        }

        const visited: boolean[][] = [];
        for (let x = 0; x < width; x++) {
            visited[x] = [];
            for (let y = 0; y < height; y++) {
                visited[x][y] = false;
            }
        }

        const result: number[][][] = [];
        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                if (differences[x][y] && !visited[x][y]) {
                    const component: number[][] = [];
                    this.floodFill({ x, y, differences, visited, component, width, height });
                    result.push(component);
                }
            }
        }
        return result;
    }

    floodFill({ x, y, differences, visited, component, width, height }: FloodFillParams) {
        if (this.isCoordsWithinImage(x, width) || this.isCoordsWithinImage(y, height) || visited[x][y] || !differences[x][y]) {
            return;
        }

        visited[x][y] = true;
        component.push([x, y]);

        this.floodFill({ x: x - 1, y, differences, visited, component, width, height });
        this.floodFill({ x: x + 1, y, differences, visited, component, width, height });
        this.floodFill({ x, y: y - 1, differences, visited, component, width, height });
        this.floodFill({ x, y: y + 1, differences, visited, component, width, height });
    }

    isCoordsWithinImage(x: number, max: number) {
        return x < 0 || x >= max;
    }

    isRightCoords(x: number, dx: number, max: number): boolean {
        return x + dx >= 0 && x + dx < max;
    }
}
