import ImageKit from "@imagekit/nodejs";

const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;

if (!privateKey) {
  throw new Error("IMAGEKIT_PRIVATE_KEY is not defined");
}

export const imagekit = new ImageKit({
  privateKey,
});

